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
    };

    this.context = context;
    this.options = {};
  }
  run(callback) {
    console.log('runrunrun!!');
  }
}

module.exports = Compiler;