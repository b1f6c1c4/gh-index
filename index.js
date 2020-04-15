const os = require('os');
const axios = require('axios');
const { TaskQueue } = require('cwait');
const path = require('path');
const fs = require('fs');
const yargRoot = require('yargs');
const debug = require('debug')('gh-index');
const GitHub = require('./github');
const HIndex = require('./h-index');

const createClient = ({ token, tokenFile }) => {
  let t;
  if (token) {
    t = token;
  }
  try {
    t = fs.readFileSync(tokenFile, 'utf-8').trim();
  } catch (e) {
    debug(`Warning: can't read token file ${tokenFile}.`);
    debug('Proceed in unauthorized mode.');
  }

  const inst = axios.create({
    method: 'get',
    baseURL: 'https://api.github.com/',
    timeout: 10000,
    headers: t ? { Authorization: `token ${t}` } : undefined,
  });

  const queue = new TaskQueue(Promise, 8);
  return queue.wrap((o) => {
    debug(o);
    return inst(o);
  });
};

const debugging = (f) => (argv) => {
  f(argv).catch((e) => {
    debug(e);
    console.error(e.message);
    if (e.response) {
      console.error(e.response.data);
    }
    process.exit(1);
  });
};

module.exports = yargRoot
  .strict()
  .option('token-file', {
    describe: 'Github token file for full control of private repos, see https://github.com/settings/tokens',
    default: path.join(os.homedir(), '.gh-index'),
    type: 'string',
  })
  .option('t', {
    alias: 'token',
    describe: 'Github token for full control of private repos, see https://github.com/settings/tokens',
    type: 'string',
  })
  .conflicts('t', 'token-file')
  .command(['show-limit', '$0'], 'Show GitHub API usage and limit', () => {}, debugging(async (argv) => {
    const github = new GitHub(createClient(argv));
    const { data } = await github.getRateLimit();
    function fix(o) {
      const r = {};
      Object.keys(o).forEach((k) => {
        if (k === 'reset') r[k] = new Date(o[k] * 1000);
        else if (typeof o[k] === 'object') r[k] = fix(o[k]);
        else r[k] = o[k];
      });
      return r;
    }
    console.log(fix(data));
  }))
  .command(['analyze [who..]', '$0'], 'Calculate h-index of Github users', (yargs) => {
    yargs
      .option('a', {
        alias: 'all',
        describe: 'Also calculate g-index and others',
        type: 'boolean',
        default: false,
      })
      .option('j', {
        alias: 'json',
        describe: 'Show in json format',
        type: 'boolean',
        default: false,
      })
      .positional('who', {
        describe: 'Github username or \'<username>/friends\'',
        type: 'string',
      });
  }, debugging(async (argv) => {
    const github = new GitHub(createClient(argv));
    const calc = new HIndex(argv.all);
    await github.requires(0);
    let { who } = argv;
    if (!Array.isArray(who)) who = [who];
    const me = who.includes('/friends') || who.includes(undefined) ? await github.getMe() : undefined;
    who = who.map((w) => {
      if (w === undefined) return { username: me, friends: false };
      if (w === '/friends') return { username: me, friends: true };
      if (!w.endsWith('/friends')) return { username: w, friends: false };
      return { username: w.split('/')[0], friends: true };
    });
    debug(who);

    who = (await Promise.all(who.map(async ({ username, friends }) => {
      const s = [{ username }];
      if (!friends) return s;
      const [fr, fg] = await Promise.all([
        github.getFollowers(username),
        github.getFollowing(username),
      ]);
      const proc = (f) => f.map((login) => ({
        username: login,
        of: username,
      }));
      return s.concat(proc(fr), proc(fg));
    }))).reduce((ws, w) => ws.concat(w), []);
    debug(who);

    await Promise.all(who.map(async (o) => {
      const { username } = o;
      const repos = await github.getRepos(username);
      Object.assign(o, { result: calc.run(repos) });
      debug(o);
    }));

    who.sort((a, b) => a.h - b.h);

    if (argv.json) console.log(JSON.stringify(who, null, 2));
    else console.log(calc.format(who));
  }))
  .help()
  .parse;
