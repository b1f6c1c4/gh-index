const hindex = require('h-index');
const ss = require('simple-statistics');
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
    const root = os[0];
    os.sort((a, b) => b.result.h - a.result.h);
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
      chars: {
        mid: '',
        'left-mid': '',
        'mid-mid': '',
        'right-mid': '',
      },
    });
    const pu = ({ username, of, result: { sum, h, i10, g, repoCount, maxRepo, maxStar } }) => {
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
    };
    os.forEach(pu);
    if (os.length > 1) {
      table.push([undefined, undefined, ...this.makeSummary(() => undefined, os)]);
      table.push([undefined, '(Sum.)', ...this.makeSummary(ss.sum, os)]);
      table.push([undefined, '(Max.)', ...this.makeSummary(ss.max, os)]);
      table.push([undefined, '(Q3. )', ...this.makeSummary((l) => ss.quantile(l, 0.75), os)]);
      table.push([undefined, '(Med.)', ...this.makeSummary(ss.median, os)]);
      table.push([undefined, '(Q1. )', ...this.makeSummary((l) => ss.quantile(l, 0.25), os)]);
      table.push([undefined, '(Min.)', ...this.makeSummary(ss.min, os)]);
      table.push([undefined, '(Avg.)', ...this.makeSummary(ss.mean, os)]);
      pu(root);
    }
    return table.toString();
  }

  makeSummary(fun, os) {
    const f = (field) => {
      const r = fun(os.map((o) => o.result[field]));
      if (r === undefined) return r;
      return Math.round(r * 100) / 100;
    };
    return [
      f('h'),
      ...(this.all ? [
        f('i10'),
        f('g'),
        f('repoCount'),
        f('sum'),
        f('maxStar'),
        undefined,
      ] : []),
    ];
  }
}

module.exports = HIndex;
