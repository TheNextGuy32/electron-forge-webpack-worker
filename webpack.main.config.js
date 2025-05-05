const path = require('path');
module.exports = {
  /**
   * This is the main entry point for your application, it's the first file
   * that runs in the main process.
   */
  entry: {
    index: './src/main.js',
    dependencyWorker: './src/dependencyWorker.js'
  },
  output: {
    filename: (pathData) => {
      return pathData.chunk.name === 'dependencyWorker' ? '/dependencyWorker.bundle.js' : '[name].js';
    },
    path: path.resolve(__dirname, '.webpack/main')
  },
  // Put your normal webpack config below here
  module: {
    rules: [
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
        },
      },
      {
        test: /src\/main.js$/,
        loader: 'string-replace-loader',
        options: {
          search: 'dependencyWorker.js',
          replace: 'dependencyWorker.bundle.js'
        }
      }
    ],
  },
  
  plugins: []
};
