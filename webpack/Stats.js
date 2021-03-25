class Stats {
  constructor(compilation) {
    this.entries = compilation.entries;
    this.chunks = compilation.chunks;
    this.modules = compilation.modules;
    this._modules = compilation._modules;
    this.assets = compilation.assets;
  }
}

module.exports = Stats;