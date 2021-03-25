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

    this._addModuleChain(context, entry, name);

    // 通知 make 事件已完成
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

  seal(callback) {

    // 给 compilation 添加 chunk
    for (const module of this.entries) {
      // 初始化 chunk.name 和 chunk.entryModule
      const chunk = new Chunk(module);

      // 给 chunk 添加模块
      chunk.modules = this.modules.filter(module => module.name === chunk.name);
      this.chunks.push(chunk);
    }

    this.createChunkAssets();

    // 执行 onCompiled()
    callback();
  }

  createChunkAssets() {
    for(const chunk of this.chunks) {
      // 给 chunk.files 赋值
      const fileName = chunk.name + '.js';
      chunk.files.push(fileName);

      // 使用 chunk 属性动态填充 ejs 模板
      const source = mainRender({
        entryId: chunk.entryModule.moduleId,
        modules: chunk.modules,
      })

      // 给 compilation 赋值相关属性
      this.assets[fileName] = source;
    }
  }
}

module.exports = Compilation;