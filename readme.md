## webpack 分析

## 1. webpack 核心库 Tapable

webpack 借助 Tabable 管理事件流，提供了多个 Hook，可根据**回调运行逻辑**和**注册触发事件的方式**分类。

1）回调运行逻辑

| 名称          | 说明                                                         |
| ------------- | ------------------------------------------------------------ |
| Hook          | 基本类型，单独执行各个回调，无关联。                         |
| BailHook      | 保险类型，当回调返回值不为 `undefined ` 时停止后续回调的执行。 |
| LoopHook      | 循环类型，如果当前回调的返回值不为 `undefined`, 则从头开始重新执行所有回调。 |
| WaterfallHook | 瀑布类型，上一个回调返回值作为下一个回调的第一个参数         |

2）注册和触发事件的方式

| 名称    | 说明                                                         |
| :------ | ------------------------------------------------------------ |
| Sync    | 多个回调同步执行，使用 `tap` 注册，`call` 执行               |
| Paralle | 多个回调异步并行执行，使用`tapAsync/tapPrimise`注册，`callAsync/promise`执行 |
| Series  | 多个回调异步串行执行，使用`tapAsync/tapPrimise`注册，`callAsync/promise`执行 |

### 1.1 实现简化 Hooks

**1) 公共构造函数和注册方法**

```js
class SyncHook {
  constructor(argArray) { // argArray 的长度表示调用时传递的参数个数
    this.tasks = [];
  }
  // tap, tapAsync, tapPromise 相同
  tap(name, task) {
    this.tasks.push(task);
  }
}
```

**2) 同步订阅和调用方法**

```js
hook.tap('name', () => {})
hook.call(args);
```

**3）异步 callAsync 订阅和调用方法**

```js
// 回调函数会被注入一个函数类型的参数 done， 函数体内需手动执行 done，表示任务已完成
hook.tapAsync(name, (...args) => {
    // 通过 pop 可以获取最后一个参数， 同时剔除注入的参数
    const done = args.pop();
    // 可选参数err，data，通过这两个参数可以控制 bail 和 waterfall
    done(err, data);
})

// 接收一个 callback，表示在所有任务完成后执行的操作
hook.callAsync(args, callback);
```

**4） 异步 promise 订阅和调用方法**

```js
// callback 需要返回一个 Promise 对象
hook.tapPromise(name, (...args) => Promise.resolve())

// 在 then 中处理所有任务完成后的操作
hook.promise(args).then(callback)
```

#### 1.1.1 同步

**1) SyncHook**

```js
// 使用三点运算符透传参数
call(...args) {
  this.tasks.forEach(task => task(...args));
}
```

**2) SyncBailHook**

```js
call(...args) {
  // 数组使用 for...of 不是 for...in
  for(const task of this.tasks) {
    if (task(...args) !== undefined) return;
  }
}
```

**3) SyncLoopHook**

```js
call(...args) {
  for(let i = 0, len = this.tasks.length; i < len; i++) {
     // 如果返回值不为 undefined，队列从头执行
    if (this.tasks[i](...args) !== undefined) i = -1;
  }
}
```

**4) SyncWaterfallHook**

```js
call(...args) {
  const [first, ...others] = this.tasks;
  // 使用 reduce 可以简洁地使前一个函数返回值作为后一个参数
  others.reduce((arg, task) => task(arg), first(...args))
}
```

#### 1.1.2 异步并行

**1) AsyncParalleHook**

```js
callAsync(...args) {
  const callback = args.pop();

  // 给 task 注入的函数类型的参数，任务执行完毕后通知
  let count = 0;
  const done = () => {
    count++;
    if (count === this.tasks.length) {
      callback();
    }
  }

  this.tasks.forEach(task => task(...args, done));
}

promise(...args) {
  // 每个 task 返回一个 Promise，使用 map 可获取所有返回的 Promise 数组  
  const promises = this.tasks.map(task => task(...args));
  return Promise.all(promises);
}
```

#### 1.1.3 异步串行

**1）AsyncSeriesHook**

```js
callAsync(...args) {
  const callback = args.pop();

  let index = 0;
  const tasks = this.tasks;

  const next = () => {
    if(index === tasks.length) {
      return callback();
    }
    tasks[index++](...args, next);
  }

  // 启动串行执行
  next();
}


promise(...args) {
  const [first, ...others] = this.tasks;
  // first(...args) 和 p.then() 和 others.reduce 都返回 Promise
  return others.reduce((p, task) => p.then(() => task(...args)), first(...args))
}
```

**4) AsyncSeriesWaterfallHook**

```js
callAsync(...args) {
  const callback = args.pop();

  let index = 0;
  const tasks = this.tasks;

  const next = (data) => {
    if (index === tasks.length) {
      return callback(data);
    }
    data === undefined ?
      tasks[index++](...args, next) : tasks[index++](data, next);
  }

  next();
}


promise(...args) {
  const [first, ...others] = this.tasks;
  return others.reduce((p, task) => p.then(value => task(value)), first(...args))
}
```



## 2. webpack 简单实现

### 2.1 执行 webpack 

```js
// 1. 引入 webpack 和配置文件
const webpack = require('webpack');
const config = require('./webpack.config')

// 2. 执行 webpack，得到唯一 compiler
const compiler = webpack(config);

// 3. 执行 compiler 的 run方法，stats 重要属性如下表
compiler.run((err, stats) => {
  console.log(stats.toJson({
    entries: true,
    chunks: true,
    modules: true,
    _modules: true,
    assets: true
  }));
})
```

| 名称     | 描述                                       |
| -------- | ------------------------------------------ |
| entries  | 入口                                       |
| chunks   | 代码块数组                                 |
| modules  | 加载的模块数组                             |
| _modules | 键为加载模块绝对路径，值为加载的模块的 Map |
| assets   | 打包后的资源数组                           |

### 2.2 整体执行流程

1. 用户执行 ` compiler = webpack(config, callback)`
   1. 创建一个 `Compiler`实例 `compiler`
   2. 载入所有插件
   3. 处理 `config`
   4. 监听 make 事件
   5. 返回 `compiler`
2. 用户执行  `compiler.run()`
   1. 触发 `make`事件，在 `make`事件中创建模块并编译
   2. `make` 执行结束后执行 `seal`封装模块
   3. `seal`执行结束后执行 `emit`, 把编译封装好的代码块写入文件系统

 ![webpack流程](.\src\webpack流程.png)

### 2.3 主要数据结构

**1) Compiler**

核心属性表：

| 属性名  | 说明               |
| ------- | ------------------ |
| context | 执行环境           |
| options | 配置对象           |
| hooks   | 包含多个钩子的对象 |

核心方法表:

| 方法名                            | 说明                                                         |
| --------------------------------- | ------------------------------------------------------------ |
| run(callback)                     | webpack 入口函数，接收一个回调函数作为参数。<br />回调函数接收两个参数，第一个是错误对象，第二个是 stats，包含一些打包说明属性。 |
| compile(callback)                 | 编译入口函数。触发 `make` 事件。<br />定义了 `make` 结束后的回调 `seal` 和 `seal `结束后的回调`onCompiled` |
| emitAssets(compilation, callback) | `onCompiled`执行时的辅助函数。创建输出文件夹并把编译后的文件写入到文件夹。 |

**2) Compilation**

核心属性表：

| 属性名   | 说明                               |
| -------- | ---------------------------------- |
| context  | 执行环境                           |
| options  | 配置对象                           |
| entries  | 入口模块                           |
| modules  | 模块                               |
| _modules | 模块Map                            |
| chunks   | 代码块                             |
| assets   | 键为代码块名，值为代码块资源的 Map |
| hooks    | 包含多个钩子的对象                 |

核心方法表：

| 方法名                                   | 说明                                                         |
| ---------------------------------------- | ------------------------------------------------------------ |
| addEntry(context, entry, name, callback) | make 钩子触发时调用的函数。<br />callback 用来通知 make 事件完成 |
| _addModuleChain(context, entry, name)    | `addEntry` 的辅助模块。<br />新建模块，编译模块              |
| seal(callback)                           | 创建 `chunks`                                                |
| createChunkAssets()                      | `seal` 函数的辅助函数                                        |

**3) Module**

核心属性表：

| 属性名       | 说明                   |
| ------------ | ---------------------- |
| name         | 模块名                 |
| context      | 执行环境               |
| request      | 模块绝对路径           |
| dependencies | 依赖模块               |
| _ast         | 抽象语法树             |
| _source      | 编译后的代码           |
| moduleId     | 模块相对执行环境的路径 |

核心方法表：

| 方法名             | 说明     |
| ------------------ | -------- |
| build(compilation) | 编译模块 |

**4) Chunk**

核心属性表:

| 属性名      | 说明             |
| ----------- | ---------------- |
| entryModule | 代码块的入口模块 |
| name        | 名称             |
| modules     | 代码块包含的模块 |

**5)Stat**

从 `compilation` 中获取相关属性，注入到最终回调中传递给用户。

### 2.4 实现 webpack()

`webpack `是一个函数，有两个参数，第一个参数是配置对象，第二个参数是一个可选的回调函数。该函数主要做了以下事情：

1. 实例化 `Compiler`
2. 设置运行环境
3. 载入`options.plugins`中的所有的插件
4. `WebpackOptionsApply` 处理 `options`， 监听 `make`事件
5. 返回 `compiler`。

`webpack`核心代码如下：

```js
const webpack = (options, callback) => {

  // 实例化一个 Compiler
  options.context = options.context || process.cwd();
  const compiler = new Compiler(options);

  // 设置运行环境
  new NodeEnvironmentPlugin().apply(compiler);

  // 加载所有插件
  if (options.plugins && Array.isArray(options.plugins)) {
    options.plugins.forEach(plugin => plugin.apply(compiler));
  }

  // 触发多个钩子，此处以 afterEnvironment 为例
  compiler.hooks.afterEnvironment.call();

  // 处理 options， 监听 make 事件
  compiler.options = new WebpackOptionsApply().process(options, compiler);

  return compiler;
}
```

`webpackOptionsApply`核心代码如下：

```js
class WebpackOptionsApply {
  process(options, compiler) {

    // 处理 outputPath, externals 等选项
    compiler.outputPath = options.output.path;

    // 监听并触发 entryOption 事件
    new EntryOptionPlugin().apply(compiler);
    compiler.hooks.entryOption.call(options.context, options.entry);
    
    return options;
  }
}
```

`EntryOptionPlugin` 核心代码如下：

```js
class EntryOptionPlugin {
  apply(compiler) {
    compiler.hooks.entryOption.tap('EntryOptionPlugin', (context, entry) => {

      // 监听 make 事件
      new SingleEntryPlugin(context, entry, 'main').apply(compiler);
      
      return true;
    })
  }
}
```

`SingleEntryPlugin` 核心代码如下：

```js
class SingleEntryPlugin {

  constructor(context, entry, name) {
    this.context = context;
    this.entry = entry;
    this.name = name;
  }

  apply(compiler) {
    
    // 监听 make 事件  
    compiler.hooks.make.tapAsync(
      'SingleEntryPlugin', 
      (compilation, callback) => {
        const { context, entry, name } = this;
          
        // 执行 compilation.addEntry 
        compilation.addEntry(context, entry, name, callback);
    })
  }
}
```

### 2.5 实现 compiler.run()

`compiler.run` 主要做了以下几件事：

1. 定义 `onCompiled` 回调，在 `emit` 阶段执行

2. 执行 `compiler.complile`

`compiler.run`的核心代码如下：

```js
run(callback) {
  
  // 定义回调，seal 阶段结束后执行
  const onCompiled = (err, compilation) => {
    this.emitAssets(compilation, err => {
      const stats = new Stats(compilation);
      callback(err, stats);
    })
  }

  this.hooks.beforeRun.callAsync(this, err => {
    this.hooks.run.callAsync(this, err => {
      // 执行 Compiler.compile 
      this.compile(onCompiled);
    })
  })
}
```

`compiler.compile` 主要做了以下几件事：

2. 实例化一个 `Compilation` 对象
3. 触发 `mnake` 事件
4. 定义 `make` 执行结束的回调 `seal`
5. 定义 `seal` 执行结束的回调

`compiler.compile`核心代码如下：

```js
compile(onCompiled) {
  this.hooks.beforeCompile.callAsync({}, err => {
    
    // 实例化 Compilation
    const compilation = new Compilation(this);

    // 触发make事件
    this.hooks.make.callAsync(compilation, err => {

      // 定义 make 执行结束的回调
      compilation.seal(err => {
        this.hooks.afterCompile.callAsync(compilation, err => {
        
          // 定义 seal 执行结束的回调  
          onCompiled(null, compilation);
        });
      })
    })
  })
}
```

### 2.5 实现 compilation.addEntry()

`compilation.addEntry` 是`make`事件触发后执行的函数，主要做以下事情：

1. 调用 `compilation._addModuleChain`
2. 调用  `callback` 通知  `make` 事件已结束

`compilation.addEntry 和 compilation._addModuleChain` 核心代码如下：

```js
addEntry(context, entry, name, callback) {

  // 调用 compilation._addModuleChain
  this._addModuleChain(context, entry, name);

  // 通知 make 事件已完成
  callback();
}
```

`compilation._addModuleChain` 主要做以下事情：

```js
_addModuleChain(context, entry, name) {
  
  // 新建模块
  const module = new NormalModule({
    name,
    context,
    request: path.posix.join(context, entry)
  })

  // 编译模块
  module.build(this);

  // 编译后的模块放入入口数组
  this.entries.push(module);
}
```

### 2.6 实现 normalModule.build()

> 用到的工具库：
>
> 1. babylon 将代码转化为 AST
> 2. babel-types 创建 AST 节点
> 3. babel-generator 将 AST 转化为代码
> 4. babel-traverse 遍历 AST， 操作 AST 节点

编译主要完成以下几件事:

1. 把代码中的所有 `require` 转换为 `__webpack_require__`
2. 获取依赖模块的绝对路径，便于递归编译模块
3. 获取依赖模块的相对`context` 的路径，替换 `require` 的请求路径
4. 递归编译

核心代码如下：

```js
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
        
        // 把 require 改为 __webpack_require__
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
```

### 2.7 实现 compilation.seal()

`make` 事件结束后会执行 `compilation.seal`，主要做了以下事情：

1. 创建 `chunk`并添加到 `compilation.chunks` 
2. 调用 `compilation.createChunkAssets()`
3. 触发`onCompiled` 回调

`seal` 核心代码如下：

```js
seal(callback) {

  // 给 compilation 添加 chunk
  for (const module of this.entries) {
      
    // 根据 module 值初始化 chunk.name 和 chunk.entryModule
    const chunk = new Chunk(module);

    // 给 chunk 添加模块
    chunk.modules = this.modules.filter(module => module.name === chunk.name);
    this.chunks.push(chunk);
  }
  this.createChunkAssets();
    
  // 执行 onCompiled()  
  callback();
}
```

`createChunkAssets` 主要做了以下事情：

1. 给 `chunk.file` 赋值
2. 填充 ejs 模板
3. 给 `compilation`赋值相关属性

`cereateChunkAssets`核心代码如下：

```js
createChunkAssets() {
  for(const chunk of this.chunks) {
    // 给 chunk.files 赋值
    const fileName = chunk.name + '.js';
    chunk.files.push(fileName);

    // 使用 chunk 属性动态填充 ejs 模板
    const source = mainRender({
      entryId: chunk.entryModule.moduleId,
      modules: chunk.modules,
    })

    // 给 compilation 赋值相关属性
    this.assets[fileName] = source;
    this.files.push(fileName);
  }
}
```

### 2.8 实现 onCompiled()

`seal` 执行结束后会触发 `onCompiled()`回调，主要做了以下事情：

1. 调用 `compiler.emitAssets()`
2. 定义回调，向外暴露一些属性，执行 `compiler.run` 的最终回调

`onCompiled` 核心代码如下：

```js
// 编译完成发射资源的回调
const onCompiled = (err, compilation) => {
  this.emitAssets(compilation, err => {
    // 通过 stats 向外暴露一些属性
    const stats = new Stats(compilation);
    // 执行 compiler.run 的回调
    callback(err, stats);
  })
}
```

`emitAssets` 主要做了以下事情：

1. 创建 `output.path` 文件夹
2. 将编译后的代码块写入文件夹
3. 执行 `onCompiled` 定义的回调

```js
emitAssets(compilation, callback) {
  const emitFiles = err => {

    // 写入文件系统
    const assets = compilation.assets;
    for (const file in assets) {
      const source = assets[file];
      const targetPath = path.posix.join(this.options.output.path, file);
      this.outputFileSystem.writeFileSync(targetPath, source);
    }

    // 执行 emit 回调
    callback();
  }

  this.hooks.emit.callAsync(compilation, err => {
    // 创建文件夹
    mkdirp(this.options.output.path, emitFiles);
  })
}
```
