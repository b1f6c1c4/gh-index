const debug = require('debug')('gh-index');

class GitHub {
  constructor(run) {
    this.run = run;
    this.limit = undefined;
  }

  static getRestLinks(link) {
    const regex = /(?<=<https:\/\/api\.github\.com)(.*?&page=)([0-9]+)(?=>)/g;
    let m = regex.exec(link);
    const base = m[1];
    const next = +m[2];
    m = regex.exec(link);
    const last = +m[2];
    debug({ base, next, last });
    const res = [];
    for (let i = next; i <= last; i++) res.push(base + i);
    return res;
  }

  getRateLimit() {
    return this.run({ method: 'get', url: '/rate_limit', headers: undefined });
  }

  async requires(n) {
    if (this.limit === undefined) {
      this.limit = +(await this.getRateLimit()).headers['x-ratelimit-remaining'];
      if (!this.limit) throw Error('X-RateLimit-Remaining has reached 0!');
    }
    if (this.limit < n) throw Error('The X-RateLimit-Remaining is not enough!');
    debug(`Requiring ${n} request(s), ${this.limit - n} left`);
    this.limit -= n;
  }

  async paginated(url) {
    await this.requires(1);
    const { headers: { link }, data } = await this.run({ method: 'get', url });
    if (data.length === 0) return [];
    const pages = [data];
    if (link) {
      debug({ link });
      const restLinks = GitHub.getRestLinks(link);
      await this.requires(restLinks.length);
      await Promise.all(restLinks.map(async (l, i) => {
        const { data: d } = await this.run({ method: 'get', url: l });
        pages[1 + i] = d;
      }));
    }
    return pages.flat();
  }

  async getMe() {
    const { data } = await this.run({ method: 'get', url: '/user' });
    return data.login;
  }

  async getRepos(user) {
    const res = await this.paginated(`/users/${user}/repos?per_page=100`);
    debug({ user, repoCount: res.length });
    return res;
  }

  async getFollowers(user) {
    const res = await this.paginated(`/users/${user}/followers?per_page=100`);
    debug({ user, followersCount: res.length });
    return res.map(({ login }) => login);
  }

  async getFollowing(user) {
    const res = await this.paginated(`/users/${user}/following?per_page=100`);
    debug({ user, followingCount: res.length });
    return res.map(({ login }) => login);
  }
}

module.exports = GitHub;
