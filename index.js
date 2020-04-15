
const fetch = require('isomorphic-fetch');
const hindex = require('h-index');
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

function getStats(user) {
  let initRateLimit;
  let pageLen;
  const rateLimit = 'https://api.github.com/rate_limit';
  const url = `https://api.github.com/users/${user}/repos?per_page=100`;
  return fetch(rateLimit)
    .then((res) => {
      // check if rate limit is exceeded
      if (res.statusText.toLowerCase() !== 'ok') {
        throw Error('connection error');
      }

      initRateLimit = +res.headers.get('X-RateLimit-Remaining');

      if (!initRateLimit) {
        throw Error('X-RateLimit-Remaining has reached 0!');
      }
      return fetch(url);
    })
    .then((res) => {
      const link = res.headers.get('Link');
      initRateLimit = +res.headers.get('X-RateLimit-Remaining');
      const pages = [res.json()];

      if (link) {
        // get rest links of the user's repos
        const restLink = getRestLink(link);
        if (restLink.length > initRateLimit) {
          throw Error('The X-RateLimit-Remaining is not enough!');
        }
        initRateLimit -= restLink.length;
        restLink.forEach((link) => pages.push(
          fetch(link).then((res) => res.json()),
        ));
      }
      pageLen = pages.length;
      return Promise.all(pages);
    })
    .then((pages) => {
      let repos = [];
      for (const page of pages) repos = repos.concat(page);

      return repos.map((repo) => repo.stargazers_count);
    })
    .then((data) => {
      console.log('User: ', user);
      console.log('The initial X-RateLimit-Remaining is: ', initRateLimit);
      console.log('The count of request is: ', pageLen);

      const res = hindex(data);
      res.repoCount = data.length;
      return res;
    })
    .catch((err) => setTimeout(() => { throw err; }, 0));
}

module.exports = getStats;
