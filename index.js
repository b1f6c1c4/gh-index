const _ = require('lodash');
const os = require('os');
const axios = require('axios');
const { TaskQueue } = require('cwait');
const path = require('path');
const fs = require('fs');
const yargRoot = require('yargs');
const debug = require('debug')('gh-index');
const cliProgress = require('cli-progress');
const GitHub = require('./github');
const HIndex = require('./h-index');
const makeCache = require('./cache');

const createClient = ({ token, tokenFile }) => {
  let t;
  if (token) {
    t = token;
  } else if (tokenFile) {
    try {
      t = fs.readFileSync(tokenFile, 'utf-8').trim();
    } catch (e) {
      debug(`Warning: can't read token file ${tokenFile}.`);
      debug('Proceed in unauthorized mode.');
    }
  }

  const inst = axios.create({
    method: 'get',
    baseURL: 'https://api.github.com/',
    headers: t ? { Authorization: `token ${t}` } : undefined,
  });

  const queue = new TaskQueue(Promise, 8);
  const cache = makeCache(inst);
  return queue.wrap((o) => {
    debug(o);
    return cache(o);
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
        describe: '<username>{,/mutual,/friends,/followers,/following}',
        type: 'string',
      });
  }, debugging(async (argv) => {
    const github = new GitHub(createClient(argv));
    const calc = new HIndex(argv.all);
    await github.requires(0);
    let { who } = argv;
    if (!Array.isArray(who)) who = [who];
    const me = who.includes(undefined)
      || who.includes('/friends')
      || who.includes('/followers')
      || who.includes('/following')
      ? await github.getMe() : undefined;
    who = who.map((w) => {
      if (w === undefined) return { username: me, friends: [false, false] };
      const [p, f] = w.split('/');
      const username = p || me;
      let friends;
      switch (f) {
        case 'mutual':
          friends = [true, true, true];
          break;
        case 'friends':
          friends = [true, true];
          break;
        case 'followers':
          friends = [true, false];
          break;
        case 'following':
          friends = [false, true];
          break;
        default:
          friends = [false, false];
          break;
      }
      return { username, friends };
    });
    debug(who);

    const bar = new cliProgress.SingleBar({
      etaBuffer: 30,
    }, cliProgress.Presets.shades_classic);
    bar.start(1, 0);
    let tot = 1;
    let val = 0;
    const updateBar = (t, v) => {
      bar.setTotal(tot += t);
      bar.update(val += v);
    };

    const dsp = async (lst) => {
      await Promise.all(lst.map(async (o) => {
        const { username } = o;
        updateBar(1, 0);
        const repos = await github.getRepos(username);
        updateBar(0, 1);
        Object.assign(o, { result: calc.run(repos) });
        debug(o);
      }));
      if (argv.json) return JSON.stringify(lst, null, 2);
      return calc.format(lst);
    };

    const disp = await Promise.all(who.map(async ({ username, friends }) => {
      const s = [{ username }];
      updateBar(2, 0);
      const [fr, fg] = await Promise.all([
        (friends[0] && github.getFollowers(username)) || [],
        (friends[1] && github.getFollowing(username)) || [],
      ]);
      updateBar(0, 2);
      const p = !friends[2] ? _.union(fr, fg) : _.intersection(fr, fg);
      const proc = (f) => f.map((login) => ({
        username: login,
        of: username,
        relation: (fr.includes(login) ? '<--' : '   ') + (fg.includes(login) ? '-->' : '   '),
      }));
      const res = await dsp(s.concat(proc(p)));
      return res;
    }));

    updateBar(0, 1);
    bar.stop();
    disp.forEach((d) => { console.log(d); });
  }))
  .help()
  .parse;
