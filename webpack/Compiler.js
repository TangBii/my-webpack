const {
	Tapable,
	SyncHook,
	SyncBailHook,
	AsyncParallelHook,
	AsyncSeriesHook
} = require("tapable");
const mkdirp = require('mkdirp');
const path = require('path');

const Stats = require('./Stats');
const Compilation = require("./Compilation");


class Compiler extends Tapable {
  constructor(context) {
    super();

    this.hooks = {
      environment: new SyncHook([]),
      afterEnvironment: new SyncHook([]),
      entryOption: new SyncBailHook(["context", "entry"]),
      afterPlugins: new SyncHook(["compiler"]),
      afterResolvers: new SyncHook(["compiler"]),
      make: new AsyncParallelHook(["compilation"]),
      beforeRun: new AsyncSeriesHook(["compiler"]),
      run: new AsyncSeriesHook(["compiler"]),
      beforeCompile: new AsyncSeriesHook(["params"]),
      compile: new SyncHook(["params"]),
      thisCompilation: new SyncHook(["compilation"]),
      compilation: new SyncHook(["compilation"]),
      afterCompile: new AsyncParallelHook(["compilation"]),
      emit: new AsyncParallelHook(["compilation"]),
      done: new AsyncSeriesHook(["stats"]),
    };

    this.context = context;
    this.options = {};
  }

  run(callback) {
    
    // 编译完成的回调
    const onCompiled = (err, compilation) => {
      this.emitAssets(compilation, err => {
        const stats = new Stats(compilation);
        this.hooks.done.callAsync(stats, err => callback());
      })
    }

    this.hooks.beforeRun.callAsync(this, err => {
      this.hooks.run.callAsync(this, err => {
        this.compile(onCompiled);
      })
    })
  }

  compile(onCompiled) {
    const params = {};
    this.hooks.beforeCompile.callAsync(params, err => {
      
      this.hooks.compile.call(params);

      const compilation = new Compilation(this);
      this.hooks.thisCompilation.call(compilation, params);
      this.hooks.compilation.call(compilation, params);

      this.hooks.make.callAsync(compilation, err => {

        // 编译完成
        compilation.seal(err => {

          // 通过模块生成代码块
          this.hooks.afterCompile.callAsync(compilation, err => {

            // 写入文件系统
            onCompiled(null, compilation);
          });
        })
      })
    })
  }

  emitAssets(compilation, callback) {
    const emitFiles = err => {
      const assets = compilation.assets;
      for (const file in assets) {
        const source = assets[file];
        const targetPath = path.posix.join(this.options.output.path, file);
        this.outputFileSystem.writeFileSync(targetPath, source);
      }
      callback();
    }

    this.hooks.emit.callAsync(compilation, err => {
      mkdirp(this.options.output.path, emitFiles);
    })
  }
}

module.exports = Compiler;