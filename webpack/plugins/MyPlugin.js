class MyPlugin {
  apply(compiler) {
    compiler.hooks.afterEnvironment.tap('MyPlugin', () => {
      console.log('MyPlugin_afterEnvironment');
    })
  }
}

module.exports = MyPlugin;