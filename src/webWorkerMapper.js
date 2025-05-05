const { Worker } = require('worker_threads');


const createDependencyWorker = () => {
  return new Promise((resolve, reject) => {
    try {
      const workerData = {};
      const worker = new Worker(new URL(`./dependencyWorker.js`, import.meta.url), {
        workerData
      });

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

module.exports = {
  createDependencyWorker
};