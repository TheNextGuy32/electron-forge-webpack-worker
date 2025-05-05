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

Or, if you please, see how to use my repo at the bottom.

### Expected

- `doAThing()` is called and completes.
- `dependencyWorker` imports and calls `doAThing()` from `dependency.js` and completes.

### Actual

- `doAThing()` is called and completes.
- `dependencyWorker` cannot import `dependency.js`, because `UnhandledPromiseRejectionWarning: Error: Cannot find module './dependency'`

#### What does webpack create?

It seems like I'm close to importing it correctly ([/.webpack](https://github.com/TheNextGuy32/electron-forge-webpack-worker/tree/master/.webpack) is checked into the repo):

[.webpack/main/35fa76c16eadbd5d7b56.js](https://github.com/TheNextGuy32/electron-forge-webpack-worker/blob/master/.webpack/main/35fa76c16eadbd5d7b56.js) this is the workers code, if it's supposed to include `./dependency.js`, it doesn't. 
```js
const { doAThing } = require('./dependency');

doAThing("dependencyWorker");
```

[.webpack/main/index.js](https://github.com/TheNextGuy32/electron-forge-webpack-worker/blob/master/.webpack/main/index.js) Im noticing it does not contain the worker code.
```js
/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ({

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
module.exports = __webpack_require__.p + "35fa76c16eadbd5d7b56.js";

/***/ }),

/***/ "electron":
/*!***************************!*\
  !*** external "electron" ***!
  \***************************/
/***/ ((module) => {

"use strict";
module.exports = require("electron");

/***/ }),

/***/ "worker_threads":
/*!*********************************!*\
  !*** external "worker_threads" ***!
  \*********************************/
/***/ ((module) => {

"use strict";
module.exports = require("worker_threads");

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = __webpack_modules__;
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/publicPath */
/******/ 	(() => {
/******/ 		__webpack_require__.p = "";
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/require chunk loading */
/******/ 	(() => {
/******/ 		__webpack_require__.b = require("url").pathToFileURL(__filename);
/******/ 		
/******/ 		// object to store loaded chunks
/******/ 		// "1" means "loaded", otherwise not loaded yet
/******/ 		var installedChunks = {
/******/ 			"main": 1
/******/ 		};
/******/ 		
/******/ 		// no on chunks loaded
/******/ 		
/******/ 		// no chunk install function needed
/******/ 		
/******/ 		// no chunk loading
/******/ 		
/******/ 		// no external install chunk
/******/ 		
/******/ 		// no HMR
/******/ 		
/******/ 		// no HMR manifest
/******/ 	})();
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// This entry needs to be wrapped in an IIFE because it needs to be isolated against other modules in the chunk.
(() => {
/*!*********************!*\
  !*** ./src/main.js ***!
  \*********************/
const { app } = __webpack_require__(/*! electron */ "electron");
const { Worker } = __webpack_require__(/*! worker_threads */ "worker_threads");
const { doAThing } = __webpack_require__(/*! ./dependency */ "./src/dependency.js");

const createDependencyWorker = () => {
  return new Promise((resolve, reject) => {
    try {
      const worker = new Worker(new URL(/* asset import */ __webpack_require__(/*! ./dependencyWorker.js */ "./src/dependencyWorker.js"), __webpack_require__.b));

      worker.on('message', (message) => {
        if (message.success !== undefined) {
          if (message.success) {            
            resolve(message.data);
          } else {
            reject(new Error(message.error));
          }
        } else if (message.type === 'log') {
          console.log(message.log);
        }
      });

      worker.on('error', (err) => {
        console.error('Worker error:', err);
        reject(err);
      });
      
      worker.on('exit', (code) => {
        if (code !== 0) {
          reject(new Error(`Worker stopped with exit code ${code}`));
        }
      });
    } catch (err) {
      console.error('Failed to create worker:', err);
      reject(err);
    }
  });
}

app.whenReady().then(async () => {
  // createWindow();
  await doAThing("main");
  await createDependencyWorker();
  app.quit();
});
})();

module.exports = __webpack_exports__;
/******/ })()
;
//# sourceMappingURL=index.js.map
```


### Repro Using My Minimal Example

- Checkout https://github.com/TheNextGuy32/electron-forge-webpack-worker
- npm install
- npm start

```
src/
    main.js
    dependencyWorker.js
    dependency.js

forge.config.js
webpack.rules.js
```

[main.js](https://github.com/TheNextGuy32/electron-forge-webpack-worker/blob/master/src/main.js)
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

[dependencyWorker.js](https://github.com/TheNextGuy32/electron-forge-webpack-worker/blob/master/src/dependencyWorker.js)
```js
const dependencyPath = './dependency';
const { doAThing } = require(dependencyPath);

doAThing("dependencyWorker");
```

[dependency.js](https://github.com/TheNextGuy32/electron-forge-webpack-worker/blob/master/src/dependency.js)
```js
const doAThing = async (source) => {
    console.log(`do a thing using ${source}`);
}
module.exports = { doAThing };
```

[webpack.rules.js](https://github.com/TheNextGuy32/electron-forge-webpack-worker/blob/master/webpack.rules.js)
```js
{
    test: /native_modules[/\\].+\.node$/,
    use: 'node-loader',
},
{
    test: /[/\\]node_modules[/\\].+\.(m?js|node)$/,
    parser: { amd: false },
    use: {
        loader: '@vercel/webpack-asset-relocator-loader',
        options: {
        outputAssetBase: 'native_modules',
        },
    }
}
```

#### Result

It can find the worker code, but the worker cannot find the dependency.
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