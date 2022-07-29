# @satumjs/midware-proxy-sandbox

[![NPM version](https://img.shields.io/npm/v/@satumjs/midware-proxy-sandbox.svg)](https://www.npmjs.com/package/@satumjs/midware-proxy-sandbox) [![NPM downloads](https://img.shields.io/npm/dt/@satumjs/midware-proxy-sandbox.svg)](https://www.npmjs.com/package/@satumjs/midware-proxy-sandbox) [![LICENSE](https://img.shields.io/npm/l/@satumjs/midware-proxy-sandbox.svg)](https://github.com/satumjs/midware-proxy-sandbox/blob/master/LICENSE) <!-- [![gitter](https://badges.gitter.im/satumjs/midware-proxy-sandbox.svg)](https://gitter.im/satumjs/midware-proxy-sandbox) --> [![CircleCI](https://circleci.com/gh/satumjs/midware-proxy-sandbox/tree/master.svg?style=svg)](https://circleci.com/gh/satumjs/midware-proxy-sandbox/tree/master) [![coveralls coverage](https://coveralls.io/repos/github/satumjs/midware-proxy-sandbox/badge.svg?branch=master)](https://coveralls.io/github/satumjs/midware-proxy-sandbox?branch=master)

a sandbox based on Proxy for satum-micro

## Usage

```js
import proxySandboxMidware from '@satumjs/midware-proxy-sandbox';

satumCore.use(proxySandboxMidware);

// use options
// satumCore.use(proxySandboxMidware, {
//   useSandBox: true, // 启用css shadow-dom 默认为true
//   winVariable(k, fakeWin, realWin): any,   // 劫持fakeWin属性
//   docVariable(k, fakeDoc, realDoc): any,   // 劫持docVariable属性
//   locationVariable(k, locationProx, location, fakeWin )  // 劫持location属性
// });
```
