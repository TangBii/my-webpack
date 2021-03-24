const SingleEntryPlugin = require('./SingleEntryPlugin');

class EntryOptionPlugin {
  apply(compiler) {
    compiler.hooks.entryOption.tap('EntryOptionPlugin', (context, entry) => {

      // 单个入口点
      new SingleEntryPlugin(context, entry, 'main').apply(compiler);
      
      return true;
    })
  }
}

module.exports = EntryOptionPlugin;