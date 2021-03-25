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
  constructor(options) {
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
    this.options = options;
    this.context = options.context;
    this.outputFileSystem = null;
		this.inputFileSystem = null;
  }

  run(callback) {
    
    // 编译完成发射资源的回调
    const onCompiled = (err, compilation) => {
      this.emitAssets(compilation, err => {
        const stats = new Stats(compilation);
        callback(err, stats);
      })
    }

    this.hooks.beforeRun.callAsync(this, err => {
      this.hooks.run.callAsync(this, err => {
        this.compile(onCompiled);
      })
    })
  }

  compile(onCompiled) {
    this.hooks.beforeCompile.callAsync({}, err => {
      
      // 实例化 Compilation
      const compilation = new Compilation(this);

      // 触发make事件
      this.hooks.make.callAsync(compilation, err => {

        // 定义 make 执行结束的回调
        compilation.seal(err => {

          // 定义 seal 执行结束的回调
          this.hooks.afterCompile.callAsync(compilation, err => {
            onCompiled(null, compilation);
          });
        })
      })
    })
  }

  emitAssets(compilation, callback) {
    const emitFiles = err => {

      // 写入文件系统
      const assets = compilation.assets;
      for (const file in assets) {
        const source = assets[file];
        const targetPath = path.posix.join(this.options.output.path, file);
        this.outputFileSystem.writeFileSync(targetPath, source);
      }

      // 执行 emit 回调
      callback();
    }

    this.hooks.emit.callAsync(compilation, err => {
      // 创建文件夹
      mkdirp(this.options.output.path, emitFiles);
    })
  }
}

module.exports = Compiler;