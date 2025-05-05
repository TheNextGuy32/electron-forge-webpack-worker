# Electron Forge and Webpack cannot do worker_threads

Electron Forge and Webpack cannot do `worker_threads` if the worker imports something.

We'd want to do this to do heavy computation without blocking the main thread, allowing the UI to remain responsive. 

The ideal situation is that I can create a worker and have it use my existing js main process code base.

I'm using webpack@5.99.7

## Repro

- `npx create-electron-app@latest my-app --template=webpack`
- Create `doAThing()` in `./src/dependency.js`.
- Create `./src/dependencyWorker.js` that uses `./src/dependency.js` to `doAThing()`.
- In `./src/main.js`, call `doAThing()` to show it works
- In `./src/main.js` create `new Worker(new URL("./src/dependencyWorker.js", import.meta.url))`.

### Expected

- `doAThing()` is called and completes.
- `dependencyWorker` imports and calls `doAThing()` from `dependency.js` and completes.

### Actual

- `doAThing()` is called and completes.
- `dependencyWorker` cannot import `dependency.js`, because `UnhandledPromiseRejectionWarning: Error: Cannot find module './dependency'`

#### What does webpack create?

`.webpack/main/ae1f6aa1d5e2f5623b44.js`
```js
const dependencyPath = './dependency';
const { doAThing } = require(dependencyPath);

doAThing("dependencyWorker");
```
`.webpack/main/index.js`
```js
/***/ "./src/dependency.js":
/*!***************************!*\
  !*** ./src/dependency.js ***!
  \***************************/
/***/ ((module) => {

const doAThing = async (source) => {
    console.log(`do a thing using ${source}`);
}

module.exports = { doAThing };


/***/ }),

/***/ "./src/dependencyWorker.js":
/*!*********************************!*\
  !*** ./src/dependencyWorker.js ***!
  \*********************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";
module.exports = __webpack_require__.p + "ae1f6aa1d5e2f5623b44.js";
```


### Repro Using My Minimal Example
```
src/
    main.js
    dependencyWorker.js
    dependency.js
```

main.js
```js
const { app } = require('electron');
const { Worker } = require('worker_threads');
const { doAThing } = require('./dependency');

const createDependencyWorker = () => {
  return new Promise((resolve, reject) => {
    try {
      const workerData = {};
      const worker = new Worker(new URL(`./dependencyWorker.js`, import.meta.url), {
        workerData
      });

      // ...
  });
}

app.whenReady().then(async () => {
  await doAThing("main");
  await createDependencyWorker();
  app.quit();
});
```

dependencyWorker.js
```js
const dependencyPath = './dependency';
const { doAThing } = require(dependencyPath);

doAThing("dependencyWorker");
```

dependency.js
```js
const doAThing = async (source) => {
    console.log(`do a thing using ${source}`);
}
module.exports = { doAThing };
```

```
$ npm start

> forge-webpack-webworkers@1.0.0 start
> electron-forge start
✔ Checking your system
✔ Locating application
✔ Loading configuration
✔ Preparing native dependencies [0.5s]
✔ Running generateAssets hook
✔ Running preStart hook

do a thing using main

Worker error: Error: Cannot find module './dependency'
Require stack:
- C:\Users\User\Documents\git\forge-webpack-webworkers\.webpack\main\ae1f6aa1d5e2f5623b44.js
    at Module._resolveFilename (node:internal/modules/cjs/loader:1232:15)
    at Module._load (node:internal/modules/cjs/loader:1062:27)
    at c._load (node:electron/js2c/node_init:2:17950)
    at TracingChannel.traceSync (node:diagnostics_channel:322:14)
    at wrapModuleLoad (node:internal/modules/cjs/loader:227:24)
    at Module.require (node:internal/modules/cjs/loader:1318:12)
    at require (node:internal/modules/helpers:136:16)
    at Object.<anonymous> (C:\Users\User\Documents\git\forge-webpack-webworkers\.webpack\main\ae1f6aa1d5e2f5623b44.js:2:22)
    at Module._compile (node:internal/modules/cjs/loader:1562:14)
    at Module._extensions..js (node:internal/modules/cjs/loader:1715:10) {
  code: 'MODULE_NOT_FOUND',
  requireStack: [
    'C:\\Users\\User\\Documents\\git\\forge-webpack-webworkers\\.webpack\\main\\ae1f6aa1d5e2f5623b44.js'
  ]
}
(node:34828) UnhandledPromiseRejectionWarning: Error: Cannot find module './dependency'
Require stack:
- C:\Users\User\Documents\git\forge-webpack-webworkers\.webpack\main\ae1f6aa1d5e2f5623b44.js
    at Module._resolveFilename (node:internal/modules/cjs/loader:1232:15)
    at Module._load (node:internal/modules/cjs/loader:1062:27)
    at c._load (node:electron/js2c/node_init:2:17950)
    at TracingChannel.traceSync (node:diagnostics_channel:322:14)
    at wrapModuleLoad (node:internal/modules/cjs/loader:227:24)
    at Module.require (node:internal/modules/cjs/loader:1318:12)
    at require (node:internal/modules/helpers:136:16)
    at Object.<anonymous> (C:\Users\User\Documents\git\forge-webpack-webworkers\.webpack\main\ae1f6aa1d5e2f5623b44.js:2:22)
    at Module._compile (node:internal/modules/cjs/loader:1562:14)
    at Module._extensions..js (node:internal/modules/cjs/loader:1715:10)
(Use `electron --trace-warnings ...` to show where the warning was created)
(node:34828) UnhandledPromiseRejectionWarning: Unhandled promise rejection. This error originated either by throwing inside of an async function without a catch block, or by rejecting a promise which was not handled with .catch(). To terminate the node process on unhandled promise rejection, use the CLI flag `--unhandled-rejections=strict` (see https://nodejs.org/api/cli.html#cli_unhandled_rejections_mode). (rejection id: 1)
```

## Context 

"Don't use worker_threads", but [`worker_threads` are useful for performing CPU-intensive JavaScript operations](https://nodejs.org/api/worker_threads.html). One might want to use a worker_thread in an Electron app to do heavy computation without blocking the main thread, allowing the UI to remain responsive.

Is this related? Electron Forge uses, and effectively must use, CommonJS not ESM, [for a long winded reason](https://github.com/electron/forge/issues/3129). But apparently Web Workers ["...\[are\] only available in ESM. Worker in CommonJS syntax is not supported by either webpack or Node.js" according to webpack 5's web worker documentation](https://webpack.js.org/guides/web-workers/).