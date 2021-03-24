const Compiler = require('./Compiler');
const NodeEnvironmentPlugin = require('./plugins/NodeEnvironmentPlugin');
const WebpackOptionsApply = require('./WebpackOptionsApply');

const webpack = (options, callback) => {

  let compiler;
  options.context = options.context || process.cwd();
  compiler = new Compiler(options.context);
  compiler.options = options;

  new NodeEnvironmentPlugin().apply(compiler);

  if (options.plugins && Array.isArray(options.plugins)) {
    options.plugins.forEach(plugin => plugin.apply(compiler));
  }

  compiler.hooks.environment.call();
  compiler.hooks.afterEnvironment.call();
  compiler.options = new WebpackOptionsApply().process(options, compiler);

  return compiler;
}

module.exports = webpack;