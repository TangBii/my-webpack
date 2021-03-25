const fs = require('fs');
const path = require('path').posix;
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
    this.moduleId = '';
  }

  // 编译
  build(compilation) {
    const { name, context, request } = this;

    // 读取原文件，转为 AST
    const originalCode = compilation.inputFileSystem.readFileSync(request, 'utf8');
    const ast = babylon.parse(originalCode);

    // 遍历 AST
    const dependencies = [];
    traverse(ast, {
      CallExpression: ({ node }) => {
        if (node.callee.name === 'require') {
          
          // require 改为 __webpack_require__
          node.callee.name = '__webpack_require__';

          // 获取依赖模块的绝对路径，便于之后递归编译
          let moduleName = node.arguments[0].value;
          const hasExt = /.js$/;
          moduleName = hasExt.test(moduleName) ? moduleName : moduleName + '.js';
          const dependencyRequest = path.join(path.posix.dirname(request), moduleName);

          // 将依赖模块的数据添加到数组
          dependencies.push({
            name,
            context,
            request: dependencyRequest
          })

          // 获取依赖模块相对路径，替换请求路径
          const dependencyRelativeRequest = './' + path.posix.relative(context, dependencyRequest);
          node.arguments[0] = types.stringLiteral(dependencyRelativeRequest);
        }
      }
    })

    // 将 AST 转换为代码
    const { code } = generate(ast);

    // 给当前模块相关属性赋值
    this._ast = ast;
    this._source = code;
    this.moduleId = './' + path.relative(context, request);

    // 给 compilation 相关属性赋值
    compilation.modules.push(this);
    compilation._modules[request] = this;

    // 递归编译
    this.dependencies = dependencies.map(
      data => new NormalModule(data).build(compilation)
    )

    return this;
  }
}

module.exports = NormalModule;