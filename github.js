const debug = require('debug')('gh-index');
const escapeRegExp = require('lodash.escaperegexp');

function getRestLink(link) {
  const baseReg = new RegExp(
    `${escapeRegExp('https://api.github.com/user/')
    }\\d+${
      escapeRegExp('/repos?per_page=100&page=')}`, 'g',
  );
  const regex = new RegExp(
    `${escapeRegExp('https://api.github.com/user/')
    }\\d+${
      escapeRegExp('/repos?per_page=100&page=')}(\\d+)`, 'g',
  );
  const next = +regex.exec(link)[1];
  const last = +regex.exec(link)[1];
  const base = baseReg.exec(link)[0];
  const res = [];
  for (let i = next; i <= last; i++) res.push(base + i);
  return res;
}

const getRateLimit = (run) => run({ method: 'get', url: '/rate_limit' });

const getRepos = (run) => async (user) => {
  let initRateLimit = +(await getRateLimit(run)).headers['X-RateLimit-Remaining'];
  if (!initRateLimit) {
    throw Error('X-RateLimit-Remaining has reached 0!');
  }
  const res = await run(`/users/${user}/repos?per_page=100`);
  const link = res.headers.Link;
  initRateLimit = +res.headers['X-RateLimit-Remaining'];
  const pages = [res.data];
  if (link) {
    // get rest links of the user's repos
    const restLink = getRestLink(link);
    if (restLink.length > initRateLimit) {
      throw Error('The X-RateLimit-Remaining is not enough!');
    }
    initRateLimit -= restLink.length;
    restLink.forEach((l) => {
      pages.push(async () => {
        const { data } = await run({ method: 'get', url: l });
        return data;
      });
    });
  }
  await Promise.all(pages);
  const repos = pages.reduce((rs, { repo }) => rs.concat(repo), []);
  debug({ user, initRateLimit, pageLen: pages.length });
  return repos;
};

module.exports.getRateLimit = getRateLimit;
module.exports.getRepos = getRepos;
