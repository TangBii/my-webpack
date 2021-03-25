const webpack = require('./webpack');
debugger
const config = require('./webpack.config.js');

const compiler = webpack(config);
compiler.run((err, stats) => {
  console.log(stats);
})