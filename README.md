# github-index
calculate the h-index, i10-index, and g-index according to github repos' stars of user

[![npm](https://img.shields.io/npm/v/github-index.svg?style=flat-square)](https://www.npmjs.com/package/github-index)

## Usage
`$ npm install github-index`

```js
var ghindex = require('.')
// this function return a promise
ghindex('tj').then(res => console.log(res))
// { sum: 65560, h: 83, i10: 168, repoCount: 241 }
```

## Note
It use [github api v3](https://developer.github.com/v3/). The rate limit is 60 requests per hour for unauthenticated requests. See https://developer.github.com/v3/#rate-limiting for details.

Don't take the result too seriously :)

## License
MIT © [flowmemo](http://weibo.com/flowmemo)
