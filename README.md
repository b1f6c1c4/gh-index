# gh-index

> Calculate h-index of a GitHub user's repo stars

[![npm](https://img.shields.io/npm/v/gh-index.svg?style=flat-square)](https://www.npmjs.com/package/gh-index)

## TL;DR

```bash
npm i -g gh-index
gh-index                          # h-index of myself
gh-index -a                       # other indexes of myself
gh-index [-a] /mutual             # ... of my followers intersect following
gh-index [-a] /friends            # ... of my followers union following
gh-index [-a] /followers          # ... of my followers
gh-index [-a] /followings         # ... of my following
gh-index [-a] b1f6c1c4 IoriOikawa # ... of some one(s) else
```

## Note

It use [GitHub Api v3](https://developer.github.com/v3/).
The rate limit is 60 requests per hour for unauthenticated requests.
See https://developer.github.com/v3/#rate-limiting for details.

Don't take the results too seriously :)

## License

* MIT © [b1f6c1c4](http://github.com/b1f6c1c4)
* MIT © [flowmemo](http://weibo.com/flowmemo)
