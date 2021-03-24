class Chunk {
  constructor(module) {
    this.entryModule = module;
    this.name = module.name;
    this.modules = [];
    this.files = [];
  }

}

module.exports = Chunk;