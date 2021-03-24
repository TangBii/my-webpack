const fs = require('fs');
const path = require('path');
const ejs = require('ejs');
const mkdirp = require('mkdirp');
const babylon = require('babylon');
const types = require('babel-types');
const generate = require('babel-generator').default;
const traverse = require('babel-traverse').default;


class NormalModule {
  constructor({ name, context, request }) {
    this.name = name;
    this.context = context;
    this.request = request;
    this.dependencies = [];
    this._ast = null;
    this._source = '';
  }

  // 编译
  build(compilation) {
    // 读取原文件，转为 AST
    const originalCode = compilation.inputFileSystem.readFileSync(this.request, 'utf8');
    const ast = babylon.parse(originalCode);

    const dependencies = [];
    // 遍历 AST
    traverse(ast, {
      CallExpression: ({ node }) => {
        if (node.callee.name === 'require') {
          
          // require 改为 __webpack_require__
          node.callee.name = '__webpack_require__';

          // 获取依赖模块的绝对路径
          let moduleName = node.arguments[0].value;
          const hasExt = /.js$/;
          moduleName = hasExt.test(moduleName) ? moduleName : moduleName + '.js';
          const dependencyRequest = path.posix.join(path.posix.dirname(this.request), moduleName);

          // 获取依赖模块相对路径
          const dependencyRelativeRequest = './' + path.posix.relative(this.context, dependencyRequest);
          // 将依赖模块的数据添加到数组
          dependencies.push({
            name: this.name, 
            context: this.context,
            request: dependencyRequest
          })

          // 替换请求路径
          node.arguments[0] = types.stringLiteral(dependencyRelativeRequest);
        }
      }
    })

    // 将 AST 转换为代码
    const { code } = generate(ast);

    this._ast = ast;
    this._source = code;
    this.moduleId = './' + path.posix.relative(this.context, this.request);
    compilation.modules.push(this);
    compilation._modules[this.request] = this;

    // 递归编译
    compilation.buildDependencies(this, dependencies);

    return this;

  }
}

module.exports = NormalModule;