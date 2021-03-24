const webpack = require('./webpack');

const config = require('./webpack.config')

const compiler = webpack(config);

compiler.run((err, stats) => {
  console.log(stats.toJson({
    entries: true,
    chunks: true,
    modules: true,
    _modules: true,
    assets: true
  }));
})