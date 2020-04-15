const os = require('os');
const axios = require('axios');
const { TaskQueue } = require('cwait');
const path = require('path');
const fs = require('fs');
const yargRoot = require('yargs');
const debug = require('debug')('gh-index');
const Table = require('cli-table');
const github = require('./github');

const createClient = ({ token, tokenFile }) => {
  let t;
  if (token) {
    t = token;
  }
  try {
    t = fs.readFileSync(tokenFile, 'utf-8').trim();
  } catch (e) {
    console.log(`Warning: can't read token file ${tokenFile}.`);
    console.log('Proceed in unauthorized mode.');
  }

  const inst = axios.create({
    method: 'get',
    baseUrl: 'https://api.github.com/',
    timeout: 10000,
    headers: t ? { Authorization: 'token ' + token } : undefined,
  });

  const queue = new TaskQueue(Promise, 32);
  return queue.wrap((o) => {
    debug(o);
    return inst(o);
  });
};

const runAnalyze = async ({ who }, token) => {
  const py = new Pythoness({ token });
  const me = await py.getMe();
  if (!who) {
    who = [me];
  } else if (typeof who === 'string') {
    who = [who];
  }

  debug({ who });
  // const res = await py.userPythoness({ user: who, publicOnly: public }, { self, star, following, followers });
  // console.log('='.repeat(110));
  // console.log(`Pythoness Report for ${who}`);
  // if (self) {
  //   console.log('='.repeat(110));
  //   console.log('Repos:');
  //   const tbl = new Table({
  //     chars: {'mid': '', 'left-mid': '', 'mid-mid': '', 'right-mid': ''},
  //     head: ['Repo', 'Pythoness', 'Senate Seats', 'The House Seats'],
  //     colWidths: [42, 25, 15, 17],
  //   });
  //   for (const r in res.self.repos) {
  //     const { pythoness, s, h } = res.self.repos[r];
  //     tbl.push([
  //       r,
  //       pythoness,
  //       s,
  //       h,
  //     ]);
  //   }
  //   console.log(tbl.toString());
  //   if (star) {
  //     console.log('Stars:');
  //     const tbl = new Table({
  //       chars: {'mid': '', 'left-mid': '', 'mid-mid': '', 'right-mid': ''},
  //       head: ['Repo', 'Pythoness', 'Senate Seats', 'The House Seats'],
  //       colWidths: [42, 25, 15, 17],
  //     });
  //     for (const r in res.self.stars) {
  //       const { pythoness, s, h } = res.self.stars[r];
  //       tbl.push([
  //         r,
  //         pythoness,
  //         s,
  //         h,
  //       ]);
  //     }
  //     console.log(tbl.toString());
  //   }
  //   console.log(`  Senate votes: ${res.self.stat.x} House votes: ${res.self.stat.y}`);
  //   console.log(`  Self pythoness: ${res.self.stat.pythoness}`);
  // }
  // if (following) {
  //   console.log('='.repeat(110));
  //   console.log('Following:');
  //   const tbl = new Table({
  //     chars: {'mid': '', 'left-mid': '', 'mid-mid': '', 'right-mid': ''},
  //     head: ['User', 'Pythoness', 'Senate Seats', 'The House Seats'],
  //     colWidths: [42, 25, 15, 17],
  //   });
  //   for (const r in res.following.users) {
  //     const { pythoness, s, h } = res.following.users[r];
  //     tbl.push([
  //       r,
  //       pythoness,
  //       s,
  //       h,
  //     ]);
  //   }
  //   console.log(tbl.toString());
  //   console.log(`  Senate votes: ${res.following.stat.x} House votes: ${res.following.stat.y}`);
  //   console.log(`  Following pythoness: ${res.following.stat.pythoness}`);
  // }
  // if (followers) {
  //   console.log('='.repeat(110));
  //   console.log('Followers:');
  //   const tbl = new Table({
  //     chars: {'mid': '', 'left-mid': '', 'mid-mid': '', 'right-mid': ''},
  //     head: ['User', 'Pythoness', 'Senate Seats', 'The House Seats'],
  //     colWidths: [42, 25, 15, 17],
  //   });
  //   for (const r in res.followers.users) {
  //     const { pythoness, s, h } = res.followers.users[r];
  //     tbl.push([
  //       r,
  //       pythoness,
  //       s,
  //       h,
  //     ]);
  //   }
  //   console.log(tbl.toString());
  //   console.log(`  Senate votes: ${res.followers.stat.x} House votes: ${res.followers.stat.y}`);
  //   console.log(`  Following pythoness: ${res.followers.stat.pythoness}`);
  // }
  // console.log('='.repeat(110));
  // console.log(`The Final Pythoness of ${who} is: ${res.pythoness}`);
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
    default: path.join(os.homedir(), '.pythoness'),
    type: 'string',
  })
  .option('t', {
    alias: 'token',
    describe: 'Github token for full control of private repos, see https://github.com/settings/tokens',
    type: 'string',
  })
  .conflicts('t', 'token-file')
  .command(['show-limit', '$0'], 'Show GitHub API usage and limit', (yargs) => {
  }, debugging(async (argv) => {
    const run = createClient(argv);
    const { data } = await github.getRateLimit(run);
    function fix(o) {
      const r = {};
      for (let k in o) {
        if (k === 'reset')
          r[k] = new Date(o[k] * 1000);
        else if (typeof o[k] === 'object')
          r[k] = fix(o[k]);
        else
          r[k] = o[k];
      }
      return r;
    }
    console.log(fix(data));
  })
  .command(['analyze [<who>...]', '$0'], 'Calculate h-index of a Github user', (yargs) => {
    yargs
      .option('a', {
        alias: 'all',
        describe: 'Also calculate g-index and others',
        type: 'boolean',
        default: false,
      })
      .positional('who', {
        describe: 'Github username or \'<username>/friends\'',
        type: 'string',
      });
  }, (argv) => {
    const token = readToken(argv);
    runCheck(argv, token).catch((e) => {
      debug(e);
      console.error(e.message);
      if (e.response) {
        console.error(e.response.data);
      }
      process.exit(1);
    });
  })
  .help()
  .parse;
