const webpack = require('./webpack');

const config = require('./webpack.config.js');

const compiler = webpack(config);
debugger
compiler.run((err, stats) => {
  // console.log(stats.toJson({
  //   entries: true,
  //   chunks: true,
  //   modules: true,
  //   _modules: true,
  //   assets: true
  // }));
})