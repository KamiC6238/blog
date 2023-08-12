---
layout: ../../layouts/BaseLayout.astro
title: 'require 源码解析'
pubDate: '2023.04.05'
author: 'Kobayashi'
tag: 'Node'
isMarkdown: true
---
## 前言
当你在一个 `js` 文件内使用 `module.exports` 导出模块以及 `require` 加载模块时，是否有想过这些变量是从哪里来的呢？如果没有或者有想过但是却没有进一步去探索，那么欢迎你阅读这篇文章，我会解析 `require` 一个模块时都发生了什么，并且回答下面几个问题：

1. 为什么我们能够在 `js` 文件内使用 `module.exports`、`exports`, `require`, `__filename`, `__dirname`？这些变量从何而来 ？
2. `module.exports` 和 `exports` 有什么区别？如果不用 `module.exports` 而是 `exports` 会怎么样？
3. 模块之间相互引入，`require` 是如何解决循环依赖的 ？
4. 当我们在终端里执行 `node index.js` 时，发生了什么 ？

## Node.js 里的模块
在 `Node.js` 里，有三种类型的模块：

1. 内建模块 (built-in module)，比如 `fs`、`path` 等等 
2. 文件模块，比如 `./a.js` 这种我们自己编写的本地文件模块
3. 第三方模块，比如 `express`、`koa` 这种模块

对于不同的模块，在使用 `require` 进行加载时，逻辑也是不同的，这些都会在下面的内容里提到，这一小节只简单介绍 `Node.js` 的模块类型有哪些。

## module 和 Module 介绍
在 `js` 文件内，我们使用 `module` 的 `exports` 属性来导出文件内容，那么 `Module` 又是什么呢？
实际上 `module` 是 `Module` 类的实例对象。为了更好的理解 `module` 和 `Module` ，我在不影响原本逻辑的情况下，将源码改造成了 TypeScript ，添加了每个字段类型和注释
```typescript
import * as path from 'path';

type Parent = Module | null | undefined;

class Module {
    /** 文件路径 */
    id = '';
    /** 模块所在的目录 */
    path = '';
    /** 模块对应的绝对路径 */
    filename = null;
    /** 模块是否加载完成 */
    loaded = false;
    /** 导出的模块内容 */
    exports = {};
    
    /** 加载模块时的入口函数 */
    static _load: (request: string, parent: Parent, isMain: boolean) => void;
    /** 模块缓存对象 */
    static _cache: Record<string, Module>;
    /** 解析模块，获取模块文件的绝对路径 */
    static _resolveFilename: (request: string, parent: Parent, isMain: boolean) => string;
    /** 加载模块内容 */
    load: (filename: string) => void;

    constructor (id: string, parent: Parent) {
        this.id = id;
        this.path = path.dirname(id);
    }
}
```
## require 的模块缓存机制
调用 `require` 加载模块时，为了避免模块之间相互引入出现循环依赖，`require` 会对已经加载过的模块进行`缓存`，当再次 `require` 同一个模块时，将会从`缓存`里将模块直接导出。
```javascript
// a.js
const moduleB = require('./b.js')
console.log('moduleA')

// b.js
const moduleA = require('./a.js')
console.log('moduleB')

// index.js
const moduleA = require('./a.js')
const moduleB = require('./b.js')
console.log('entry')
```
最终执行结果，可以看到这里对 `a.js` 加载了两次，但是只打印了一次 moduleA

![image.png](https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/16772b66bc8a44b6b29f1d2b2c07699e~tplv-k3u1fbpfcp-watermark.image?)

从结果上看，当 `node index.js` 被执行时，首先进入 `a.js` 模块，接着 `a.js` 模块引入了 `b.js` 模块，而 `b.js` 又引入了 `a.js`，如果没有缓存，那么这里 `a.js` 与 `b.js` 之间的相互引入将无穷无尽，而正因为有缓存，当在 `b.js` 引入 `a.js` 时，由于 `a.js` 已经在 `index.js` 里被引入过一次，因此再次引入时，将会直接返回缓存的结果，所以控制台先打印 `moduleB` ，`b.js` 代码执行完后，再回到 `a.js` 打印 `moduleA` ，最终回到 `index.js` 打印 `entry` 

那么`缓存`是如何实现的呢？
`Module._load` 是加载一个模块时会被执行的方法，对于首次加载的模块来说，会将模块对应的绝对路径解析出来，然后创建一个新的模块，最终将这个模块添加到 `Module._cache` 里。
```javascript
Module._load = function(request, /** */, /** */) {
    // ...省略部分代码
    
    // 这部分是伪代码，只简单介绍缓存的实现机制，具体的实现会在后面讲到
    let cacheFilename = 'xxx';
    const cacheModule = Module._cache[cacheFilename];
    // 如果有缓存，那么直接返回对应的模块 
    if (cacheModule) {
        return cacheModule;
    }
    
    // 如果没有缓存，那么创建一个新模块
    const filename = Module._resolveFilename(request);
    const module = new Module(filename);
    // 把模块添加到缓存内
    Module._cache[filename] = module;
    
    // ...省略部分代码
}
```

## require 的模块加载机制
在 `require` 的执行过程中，对于不同类型的模块，加载模块的逻辑也会不一样。
### 内建模块
当 `node index.js` 被执行时, `node` 在启动过程中，会将内建模块进行编译并且写到内存中。并且`内建模块`与`文件模块`以及`第三方模块`不同，加载内建模块并不会将内建模块写入到`缓存`里，代码示例如下：
```javascript
// a.js
const fs = requie('node:fs')
const moduleB = require('./b.js')

console.log('module: ', module);
```
在 `console.log` 这一行代码打个断点，我们会看到下图：

![image.png](https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/c8772ae26b8f473795e8e4bdd08da736~tplv-k3u1fbpfcp-watermark.image?)
可以看到在缓存里，只有 `a.js` 和 `b.js` 这两个文件模块的缓存，并没有内建模块 `fs` 的缓存。

值得一提的是，内建模块的加载优先级，是仅次于缓存的，也就是说会先判断模块是否有缓存，没有的话才会判断加载的模块是否为内建模块。
### 文件模块 & 第三方模块
文件模块就是类似 `a.js` 这种我们自己创建的，而第三方模块通常是我们通过 `npm install` 或者 `yarn add` 安装的第三方库，第三方库存在于项目目录下的 `node_modules` 目录。

在加载过程中，核心的方法是 `Module._resolveFilename` 

```javascript
Module._resolveFilename = function(request, parent, isMain) {
    let paths;
    // 收集模块文件所在的所有可能的路径
    paths = Module._resolveLookupPaths(request, parent);
    // 确定文件所在的真正路径
    const filename = Module._findPath(request, paths, isMain);

    return filename;
}
```
`Module._resolveFilename` 这个方法做了两件事：

1. 通过 `Module._resolveLookupPaths` 收集模块文件所在的所有可能的路径(如下图
![image.png](https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/923fd641dedf4792b528f688a9f7c33b~tplv-k3u1fbpfcp-watermark.image?)
2. 通过 `Module._findPath` 确定文件所在的真正路径，这里我为了把加载过程写的更清楚，简化了很多代码。
```javascript
Module._findPath = function(request, paths, isMain) {
    //...省略部分代码
    
    // 遍历每一个路径查找文件
    for (let i = 0; i < paths.length; i++) {
        const curPath = paths[i];
        const basePath = path.resolve(curPath, request);
        let filename;
        
        // 获取文件的类型
        const rc = _stat(basePath);
        // rc === 0 说明是文件
        if (rc === 0) {
            filename = toRealPath(basePath);
        }
        
        // rc === 1 说明是目录
        if (!filename && rc === 1) {
            // exts 就是文件后缀，其中有 js, json 和 node
            const exts = ObjectKeys(Module._extensions);
            // 此时检查该目录下是否有 package.json 文件
            filename = tryPackage(basePath, exts, isMain, request);
        }
        
        return filename;
    }
}
```
```javascript
function tryPackage(basePath, exts, isMain, request) {
    // 查找 package.json，如果有 package.json，检查是否设置了 main 属性的值
    const pkg = _readPackage(requestPath)?.main;
    
    // 如果没有 main 属性，那么就默认找 index.js 文件，如果没有就找 index.json，最后则是 index.node
    if (!pkg) {
        return tryExtensions(path.resolve(requestPath, 'index'), exts, isMain);
    }
    
    // 如果有 main 属性，那么找到这个 main 属性对应的值，最终生成 filename
    // 这里我也做了简化，把一些异常处理代码删掉了
    return path.resolve(requestPath, pkg);
}
```
上述的加载流程大致如下图：

查找第三方模块的过程，实际上就是在循环的过程中，一级一级的往上查找 `node_modules` 目录，如果找到了要加载的模块，那么再判断这个模块对应的 `packages.json` 是否指定了 `main` 属性，如果有指定了 `main` 属性，那么就加载 `main` 属性指向的文件，否则默认指向 `index.js`，如果没有 `index.js` 文件，那么就查找 `index.json` ，还没有就找 `index.node`，如果都找不到，那么将会报错。

![image.png](https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/2ab372ca7729486cb80ea8b1ea35ed91~tplv-k3u1fbpfcp-watermark.image?)

理解了 `模块的缓存机制` 和 `模块的加载机制`，接下来就是完整的 `require` 的过程了。
## require 流程
```typescript
/**
 * 入口函数，根据缓存机制，有缓存直接返回
 * 没有缓存，检查是否是内建模块，是的话直接返回
 * 没有缓存，也不是内建模块，那么生成模块的绝对路径，开始解析
 */
Module._load
// 解析模块路径的后缀，调用 Module._extionsions 加载模块，加载完成后，将模块的 loaded 属性设置为 true
Module.prototype.load
// 加载模块内容，调用 Module._compile 对模块内容进行编译
Module._extensions
// 将 module、 exports、require、__dirname、 __filename 等核心变量，注入模块的内容里
Module._compile
// 完成编译后，返回模块的 exports 对象
return module.exports
```

## 简化后的完整源码流程
### Module._load
当我们使用 `require` 来加载模块时，`Module._load` 就会被第一个执行，我们来看看这个方法都做了什么
```typescript
/** 缓存解析过的文件绝对路径 */
const relativeResolveCache = {};

/**
 * @desc 加载模块
 * @param request 加载的模块
 * @param parent 父模块
 * @param isMain 是否为主模块
 */
Module._load = function(request: string, parent: Parent, isMain: boolean) {
    // 记录需要加载的模块路径
    let relResolveCacheIdentifier;

    /**
     * 比如在 a.js 里 require('./b.js'), 那么 a.js 就是父模块，
     * 相当于在 a.js 加载 b.js 模块时，先判断是否有 b.js 模块的缓存
     */
    if (parent) {
        relResolveCacheIdentifier = `${parent.path}${request}`;
        // 从缓存文件绝对路径的对象里查找是否有对应的路径
        const filename = relativeResolveCache[relResolveCacheIdentifier];

        if (filename !== undefined) {
            // 根据模块绝对路径查找缓存的模块
            const cacheModule = Module._cache[filename];
            // 如果有缓存的模块，返回模块的 exports 对象
            if (cacheModule !== undefined) {
                return cacheModule.exports;
            }
        }
    }

    /**
     * 如果是 require('node:fs')，会进入加载内建模块的逻辑，
     * 内建模块是提前经过编译转成二进制文件写进内存的。
     * 所以如果加载的是内建模块，那么直接返回 module.exports 就可以了
     */
    if (StringPrototypeStartsWith(request, 'node:')) {
        /** 省略部分代码，方便理解 */
        const module = loadBuiltinModule(/** */);
        return module.exports;
    }

    // 如果该模块即没有缓存，请求的模块也不是 node: 开头的，那么开始解析这个模块文件的绝对路径
    const filename = Module._resolveFilename(request, parent, isMain);
    
    /**
     * 因为即使不是 node: 开头，该模块也可能是内建模块，比如 require('fs')，
     * 所以这里再一次判断是否为内建模块
     */
    const mod = loadBuiltinModule(filename, request);
    
    // 这里对源码做了简化处理，方便理解
    if (mod) {
        return mod.exports;
    }

    // 如果不是内建模块，那么创建一个新的模块对象
    const module = new Module(filename, parent);
    // 把模块添加到缓存内
    Module._cache[filename] = module;
    /**
     * 把解析后的模块绝对路径也缓存起来，这样下次加载同样的模块时，就不需要再次解析模块路径了，
     * 这也是一种优化手段。
     */
    if (parent !== undefined) {
        relativeResolveCache[relResolveCacheIdentifier] = filename;
    }

    // 当拿到模块的绝对路径后，就可以开始真正的加载了
    module.load(filename);
    // 等模块真正加载完成后，模块的内容会被挂载到 module.exports 对象上，此时返回就结束整个流程了。
    return module.exports;
}
```

### Module.prototype.load
```javascript
Module.prototype.load = function(filename) {
    this.filename = filename;
    // 解析文件的后缀，比如加载的是 js 模块，那么后缀就是 .js
    const extension = findLongestRegisteredExtension(filename);
    // 加载模块内容
    Module._extensions[extension](this, filename);
    this.loaded = true;
}
```
### Module._extensions
```javascript
Module._extensions['.js'] = function(module, filename) {
    // 读取文件的内容
    let content = fs.readFileSync(filename, 'utf8');
    // 对文件内容进行编译
    module._compile(content, filename);
}
```
### Module._compile
```javascript
Module.prototype._compile = function(content, filename) {
    /**
     * 这里的 `wrapSafe` ，其实是将文件的内容包裹在另一个函数里面，最终结果如下
     * (function (exports, require, module, __filename, __dirname) {
     *      // a.js
     *      const moduleB = require('./b.js')
     *       
     *      module.exports = {
     *          a: 1,
     *          b: 2
     *      }
     *  });
     */
    const compiledWrapper = wrapSafe(filename, content, this);
    // 模块目录
    const dirname = path.dirname(filename);
    // 创建一个 require 函数
    const require = makeRequireFunction(this, redirects);
    // 创建一个 exports 变量，exports 指向 module.exports
    const exports = this.exports;
    const thisValue = exports;
    const module = this;
    
    // 最终将 exports require module filename dirname 等变量注入 compiledWrapper
    // 之后，模块内就可以使用这些变量了
    ReflectApply(
        compiledWrapper,
        thisValue,
        [exports, require, module, filename, dirname]
    )
}
```
上面的流程结束后，我们再回过头来看 `Module._load` 这个方法的最后一行代码
```javascript
Module._load = function (...) {
    // ...
    return module.exports
}
```
所以本质上，`require` 一个模块时，就是对模块内容进行一层包裹，然后将 `module` `exports` 等变量写入模块内容里，最终模块里就可以使用 `module.exports` 去导出模块，也可以使用 `require` 去加载模块。

## 总结
最后，我们来回答一下文章开头提出的问题

### Q1

为什么我们能够在 `js` 文件内使用 `module.exports`、`exports`, `require`, `__filename`, `__dirname`？这些变量从何而来 ？

### A1

这是因为在加载模块的过程中，`node` 会对模块进行编译，之后将这些变量传入模块内，所以最终模块可以去使用这些变量。

### Q2

`module.exports` 和 `exports` 有什么区别？如果不用 `module.exports` 而是 `exports` 会怎么样？

### A2

从 `Module.prototype._compile` 这个方法我们可以看到，注入到模块内的 `exports` 变量，只是 `module.exports` 的一个引用，而且 `Module._load` 最终返回的结果是 `module.exports` 而不是 `exports`，因此如果要导出的内容如果写在 `exports` 里而不是 `module.exports` 里，那么导入模块时，是无法取到预期的内容的。代码示例如下：


```javascript
// a.js
const moduleB = require('./b.js');

console.log('moduleB:', moduleB)

// b.js
module.exports = {};

exports = {
    foo: function() {
        console.log(1)
    }
}
```

![image.png](https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/ba56f352a4644db58440903c58d4c917~tplv-k3u1fbpfcp-watermark.image?)

### Q3

模块之间相互引入，`require` 是如何解决循环依赖的 ？

### A3

`require` 在加载模块时是有缓存的，对于已经加载过一次的模块，再次加载时，会直接返回缓存的模块，避免循环依赖。


### Q4
当我们在终端里执行 `node index.js` 时，发生了什么 ？

### A4
关于这个问题，有些同学可能会疑惑，就是 `a.js` 引入 `b.js` ，会对 `b.js` 进行编译然后注入 `require` 等变量，只有这样 `b.js` 才能使用 `require`，那么 `a.js` 明明没被引用，为什么也能使用 `require` 呢？

其实是因为在执行 `node index.js` 时，本质上还是执行了 `Module._load`，下面代码段的 `process.argv[1]`，其实就是 `index.js`
```javascript
function executeUserEntryPoint(main = process.argv[1]) {
    const { Module } = require('internal/modules/cjs/loader');
    Module._load(main, null, true);
  }
}
```
