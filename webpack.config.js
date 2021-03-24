const path = require('path');
const MyPlugin = require('./webpack/plugins/MyPlugin');

module.exports = {
  mode: 'development',
  entry: './src/index.js',
  output: {
    filename: 'main.js', 
    path: path.resolve(__dirname, 'dist')
  },
  plugins: [
    new MyPlugin(),
  ]
}