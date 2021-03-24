const {
	Tapable,
	SyncHook,
	SyncBailHook,
	AsyncParallelHook,
	AsyncSeriesHook
} = require("tapable");

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
    };

    this.context = context;
    this.options = {};
  }

  run(callback) {
    
    // 编译完成的回调
    const onCompiled = (err, compilation) => {
      
    }

    this.hooks.beforeRun.callAsync(this, err => {
      this.hooks.run.callAsync(this, err => {
        this.compile(onCompiled);
      })
    })
  }

  compile(callback) {
    const params = {};
    this.hooks.beforeCompile.callAsync(params, err => {
      
      this.hooks.compile.call(params);

      const compilation = new Compilation(this);
      this.hooks.thisCompilation.call(compilation, params);
      this.hooks.compilation.call(compilation, params);

      this.hooks.make.callAsync(compilation, err => {
        console.log('make 结束');
      })
    })
  }
}

module.exports = Compiler;