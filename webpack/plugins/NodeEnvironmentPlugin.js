const fs = require('fs');

class NodeEnvironmentPlugin {
  apply(complier) {
    complier.inputFileSystem = fs;
    complier.outputFileSystem = fs;
  }
}

module.exports = NodeEnvironmentPlugin;