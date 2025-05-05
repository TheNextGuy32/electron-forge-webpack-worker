const { app } = require('electron');
const { Worker } = require('worker_threads');
const { doAThing } = require('./dependency');
const path = require('path');

const createDependencyWorker = () => {
  return new Promise((resolve, reject) => {
    try {
      // Use the compiled worker file from the webpack output directory
      const workerPath = path.join(__dirname, 'dependencyWorker.bundle.js');
      console.log(`Loading worker from: ${workerPath}`);
      const worker = new Worker(workerPath);

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