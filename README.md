# gh-index

> Calculate h-index of a GitHub user's repo stars

[![npm](https://img.shields.io/npm/v/gh-index.svg?style=flat-square)](https://www.npmjs.com/package/gh-index)
[![npm](https://img.shields.io/npm/dt/gh-index.svg?style=flat-square)](https://www.npmjs.com/package/gh-index)
[![GitHub last commit](https://img.shields.io/github/last-commit/b1f6c1c4/gh-index.svg?style=flat-square)](https://github.com/b1f6c1c4/gh-index)
[![GitHub code size in bytes](https://img.shields.io/github/languages/code-size/b1f6c1c4/gh-index.svg?style=flat-square)](https://github.com/b1f6c1c4/gh-index)
[![license](https://img.shields.io/github/license/b1f6c1c4/gh-index.svg?style=flat-square)](https://github.com/b1f6c1c4/gh-index/blob/master/LICENSE.md)

## TL;DR

```bash
npm i -g gh-index
# Generate a token at https://github.com/settings/tokens
echo the-token > ~/.gh-index
gh-index                          # h-index of myself
gh-index -a                       # other indexes of myself
gh-index [-a] /mutual             # ... of my followers intersect following
gh-index [-a] /friends            # ... of my followers union following
gh-index [-a] /followers          # ... of my followers
gh-index [-a] /followings         # ... of my following
gh-index [-a] b1f6c1c4 IoriOikawa # ... of some one(s) else
gh-index show-limit               # check how many API calls left
```

## Usage

```
gh-index [show-limit | who..]

Calculate h-index of Github users

Commands:
  gh-index    show-limit       Show GitHub API usage and limit
  gh-index    analyze [who..]  Calculate h-index of Github users       [default]

Positionals:
  who  <username>{,/mutual,/friends,/followers,/following}              [string]

Options:
  --version     Show version number                                    [boolean]
  --token-file  Github token file for full control of private repos, see
                https://github.com/settings/tokens
                                               [string] [default: "~/.gh-index"]
  -t, --token   Github token for full control of private repos, see
                https://github.com/settings/tokens                      [string]
  --help        Show help                                              [boolean]
  -a, --all     Also calculate g-index and others     [boolean] [default: false]
  -j, --json    Show in json format                   [boolean] [default: false]
```

## Note

It use [GitHub Api v3](https://developer.github.com/v3/).
The rate limit is 60 requests per hour for unauthenticated requests.
See https://developer.github.com/v3/#rate-limiting for details.

Don't take the results too seriously :)

## License

* MIT © [b1f6c1c4](http://github.com/b1f6c1c4)
* MIT © [flowmemo](http://weibo.com/flowmemo)
