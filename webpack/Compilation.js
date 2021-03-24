const path = require('path');

const {
	Tapable,
	SyncHook,
	SyncBailHook,
	AsyncParallelHook,
	AsyncSeriesHook
} = require("tapable");

const NormalModule = require('./NormalModule');

class Compilation extends Tapable {
  constructor(compiler) {
    super();
    this.compiler = compiler;
    this.context = compiler.context;
    this.options = compiler.options;
    this.inputFileSystem = compiler.inputFileSystem;
    this.outputFileSystem = compiler.outputFileSystem;
    this.entries = [];
    this.modules = [];
    this._modules = [];
    this.hooks = {
      addEntry: new SyncHook(["entry", "name"]),
    };
  }

  addEntry(context, entry, name, callback) {

    this.hooks.addEntry.call(entry, name);

    this._addModuleChain(context, entry, name);

    callback();
  }

  _addModuleChain(context, entry, name) {
    
    // 新建模块
    const module = new NormalModule({
      name,
      context,
      request: path.posix.join(context, entry)
    })

    // 编译模块
    module.build(this);

    // 编译后的入口模块放入数组
    this.entries.push(module);
  }
}

module.exports = Compilation;