const { parentPort, workerData } = require('worker_threads');

const dependencyPath = '../lib/dependency';
const { doAThing } = require(dependencyPath);

doAThing("dependencyWorker");
  
