const hindex = require('h-index');
const Table = require('cli-table3');

class HIndex {
  constructor(all) {
    this.all = all;
  }

  run(repos) {
    if (!repos.length) return { ...hindex([]), repoCount: 0, maxRepo: undefined, maxStar: 0 };
    if (!this.all) return hindex(repos.map((r) => r.stargazers_count));
    const rs = repos.sort((a, b) => b.stargazers_count - a.stargazers_count);
    const h = hindex(rs.map((r) => r.stargazers_count));
    return {
      ...h,
      repoCount: repos.length,
      maxRepo: rs[0].html_url,
      maxStar: rs[0].stargazers_count,
    };
  }

  format(os) {
    const table = new Table({
      head: [
        'Friend of',
        'Username',
        'h-index',
        ...(this.all ? [
          'i10-index',
          'g-index',
          'Total Repos',
          'Total Stars',
          'Most Stars',
          'Most-Star Repo',
        ] : []),
      ],
    });
    os.forEach(({ username, of, result: { sum, h, i10, g, repoCount, maxRepo, maxStar } }) => {
      table.push([
        of,
        username,
        h,
        ...(this.all ? [
          i10,
          g,
          repoCount,
          sum,
          maxStar,
          maxRepo,
        ] : []),
      ]);
    });
    return table.toString();
  }
}

module.exports = HIndex;
