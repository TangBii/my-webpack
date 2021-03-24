class NormalModule {
  constructor({ name, context, request }) {
    this.name = name;
    this.context = context;
    this.request = request;
    this.dependencies = [];
    this.moduleId = '';
    this._ast = null;
    this._source = '';
  }

  // 编译
  build(compilation) {
    
  }
}

module.exports = NormalModule;