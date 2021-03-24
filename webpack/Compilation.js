const path = require('path');
const fs = require('fs');
const ejs = require('ejs');

const Chunk = require('./Chunk');

const {
	Tapable,
	SyncHook,
	SyncBailHook,
	AsyncParallelHook,
	AsyncSeriesHook
} = require("tapable");

const NormalModule = require('./NormalModule');

const mainTemplate = fs.readFileSync(path.posix.join(__dirname, 'main.ejs'), 'utf8');
const mainRender = ejs.compile(mainTemplate);

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
    this.chunks = [];
    this.files = [];
    this.assets = {};
    this.hooks = {
      addEntry: new SyncHook(["entry", "name"]),
      seal: new SyncHook([]),
      beforeChunks: new SyncHook([]),
      afterChunks: new SyncHook([]),
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

  buildDependencies(module, dependencies) {
    module.dependencies = dependencies.map(data => {
      const module = new NormalModule(data);
      return module.build(this);
    })
  }

  seal(callback) {
    this.hooks.seal.call();
    this.hooks.beforeChunks.call();
    for (const entryModule of this.entries) {
      const chunk = new Chunk(entryModule);
      this.chunks.push(chunk);
      chunk.modules = this.modules.filter(module => module.name === chunk.name);
    }
    this.hooks.afterChunks.call();
    this.createChunkAssets();
    callback();
  }

  createChunkAssets() {
    for(let i = 0; i < this.chunks.length; i++) {
      const chunk = this.chunks[i];
      chunk.files = [];
      const file = chunk.name + '.js';
      const source = mainRender({
        entryId: chunk.entryModule.moduleId,
        modules: chunk.modules,
      })
      chunk.files.push(file);
      this.emitAssets(file, source);
    }
  }

  emitAssets(file, source) {
    this.assets[file] = source;
    this.files.push(file);
  }
}

module.exports = Compilation;