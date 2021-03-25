const EntryOptionPlugin = require('./plugins/EntryOptionPlugin');
class WebpackOptionsApply {
  process(options, compiler) {

    // 处理 outputPath, externals 等选项
    compiler.outputPath = options.output.path;

    // 监听并触发 entryOption 事件
    new EntryOptionPlugin().apply(compiler);
    compiler.hooks.entryOption.call(options.context, options.entry);
    
    return options;
  }
}

module.exports = WebpackOptionsApply;