const _ = require('lodash');
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

  format(oos) {
    const root = oos[0];
    const os = _.sortBy(oos, ['result.h', 'result.g', 'result.i10', 'result.sum', 'result.maxStar']).reverse();
    const table = new Table({
      head: [
        'Friend of',
        'Relation',
        'Username',
        'h-index',
        ...(this.all ? [
          'g-index',
          'i10-index',
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
    const pu = ({ username, of, relation, result: { sum, h, i10, g, repoCount, maxRepo, maxStar } }) => {
      table.push([
        of,
        relation,
        username,
        h,
        ...(this.all ? [
          g,
          i10,
          repoCount,
          sum,
          maxStar,
          maxRepo,
        ] : []),
      ]);
    };
    os.forEach(pu);
    if (os.length > 1) {
      table.push([undefined, undefined, undefined, ...this.makeSummary(() => undefined, os)]);
      table.push([undefined, undefined, '(Sum.)', ...this.makeSummary(ss.sum, os)]);
      table.push([undefined, undefined, '(Max.)', ...this.makeSummary(ss.max, os)]);
      table.push([undefined, undefined, '(Q3. )', ...this.makeSummary((l) => ss.quantile(l, 0.75), os)]);
      table.push([undefined, undefined, '(Med.)', ...this.makeSummary(ss.median, os)]);
      table.push([undefined, undefined, '(Q1. )', ...this.makeSummary((l) => ss.quantile(l, 0.25), os)]);
      table.push([undefined, undefined, '(Min.)', ...this.makeSummary(ss.min, os)]);
      table.push([undefined, undefined, '(Avg.)', ...this.makeSummary(ss.mean, os)]);
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
        f('g'),
        f('i10'),
        f('repoCount'),
        f('sum'),
        f('maxStar'),
        undefined,
      ] : []),
    ];
  }
}

module.exports = HIndex;
