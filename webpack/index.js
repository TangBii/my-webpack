const Compiler = require('./Compiler');
const NodeEnvironmentPlugin = require('./plugins/NodeEnvironmentPlugin');
const WebpackOptionsApply = require('./WebpackOptionsApply');

const webpack = (options, callback) => {

  // 实例化一个 Compiler
  options.context = options.context || process.cwd();
  const compiler = new Compiler(options);

  new NodeEnvironmentPlugin().apply(compiler);

  // 加载所有插件
  if (options.plugins && Array.isArray(options.plugins)) {
    options.plugins.forEach(plugin => plugin.apply(compiler));
  }

  // 触发多个钩子，此处以 afterEnvironment 为例
  compiler.hooks.afterEnvironment.call();

  // 处理 options， 监听 make 事件
  compiler.options = new WebpackOptionsApply().process(options, compiler);

  return compiler;
}

module.exports = webpack;