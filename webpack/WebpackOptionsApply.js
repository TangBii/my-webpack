const EntryOptionPlugin = require('./plugins/EntryOptionPlugin');
class WebpackOptionsApply {
  process(options, compiler) {
    // 处理 outputPath, externals 等选项
    compiler.outputPath = options.output.path;

    // 注册并执行 entryOption 事件
    new EntryOptionPlugin().apply(compiler);
    compiler.hooks.entryOption.call(options.context, options.entry);

    compiler.hooks.afterPlugins.call(compiler);
    compiler.hooks.afterResolvers.call(compiler);

    return options;
  }
}

module.exports = WebpackOptionsApply;