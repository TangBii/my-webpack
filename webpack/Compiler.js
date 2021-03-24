const {
	Tapable,
	SyncHook,
	SyncBailHook,
	AsyncParallelHook,
	AsyncSeriesHook
} = require("tapable");

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
    };

    this.context = context;
    this.options = {};
  }
  run(callback) {
    console.log('runrunrun!!');
  }
}

module.exports = Compiler;