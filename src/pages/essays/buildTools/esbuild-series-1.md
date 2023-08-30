---
layout: ../../../layouts/BaseLayout.astro
title: 'esbuild 插件开发'
pubDate: '2023.05.26'
author: 'Kobayashi'
tag: 'Build Tools'
tagName: '构建'
isMarkdown: true
order: -1
---


### 前言
最近在学习 `Vite` 相关的知识，由于工作上很少接触到构建工具相关的内容，所以想要好好了解下。至少在未来的某个时间点里，我能够在这方面有着自己的思考，这样就足够了。

本篇文章不会涉及到 `Vite` 相关的内容，而是和 `esbuild` 有关。

该文章分为以下几部分：

  - esbuild 的打包流程
  - 如何理解插件？
  - esbuild 的插件组成 & 核心 hook
  - 写一个 CDN 依赖拉取插件
  - 写一个简易 HTML 构建插件
  - 总结
### esbuild 的打包流程
我在[认识 require](/essays/node/node-series-1)里，提到当通过 `require` 去加载一个模块时，首先需要通过解析模块的路径来找到这个模块，接着再去真正加载模块的内容，之后对内容进行编译，最终将模块导出。

当然，这里提到的编译与 `esbuild` 的编译并不是一回事，但整体流程是相似的。总的来说，`esbuild` 的打包流程为：**_解析模块 -> 加载模块 -> 对模块进行编译 -> 产出构建产物_**
### 如何理解插件？
插件是在工作中经常听到或者看到的词，比如 `webpack` 的插件，或者是 `Vite` 的插件等。插件的运作过程，可以简单理解为是在构建的过程中，做一些额外的事情。本质上来说，插件指的是，在原有的体系结构内，进行拓展或者是自定义。
### esbuild 的插件组成 & 核心 hook
#### esbuild 插件组成
`esbuild` 的插件本质上是一个`Object`，由两部分组成：
 - `name`： 插件的名称
 - `setup`： 一个函数，当使用 `esbuild` 提供的 `build` api 进行构建时，每个插件的 `setup` 函数将会被执行，代码示例如下：
```javascript
// testPlugin.js
module.exports = () => ({
    name: 'esbuild:plugin-test',
    setup(build) {
        // 当下面的 runBuild 方法被执行时，setup 也会被执行
    }
})

// build.js
const { build } = require('esbuild');
const testPlugin = require('./testPlugin');

function runBuild() {
    // 开始构建
    build({
        // 构建时的入口文件
        entryPoints: ['./src/index.jsx'],
        // 构建产物的输出目录
        outdir: 'dist',
        // 执行 testPlugin 插件，返回一个对象
        plugins: [testPlugin()]
        ...
    })
}

runBuild();
```
读到这里，可能有读者会疑惑为什么没有解释 `setup` 函数的入参 `build` ，原因是我想结合上一节来进行解释。在`如何理解插件` 这一小节里，我提到了“**插件本质上是在原有的体系结构上进行拓展和自定义**”，因此在上述代码示例里，`setup` 函数就是用于进行拓展和自定义的地方，而 `setup` 函数的入参 `build` ，提供了构建过程中不同阶段的 hook 供我们使用，使得我们可以**对模块进行拓展和自定义**。
#### 核心 hook
该文章只会介绍使用到的 hook，其中有 `onResolve` & `onLoad` & `onEnd` 。
##### onResolve
`onResolve` 在**解析模块**阶段将会被执行，接收两个参数

 - `data: {filter: string; namespace?: string}`：解析模块使用的参数

    - filter：正则，可以用来过滤具体的模块
    - namepace：每个模块的命名空间，也同样可以用来过滤模块
 - `callback`：解析模块时执行的回调，接收一个参数，该参数包含了模块的一些基本信息，如下图:

![image](/public/buildTools/esbuild/2.png)

代码示例：
```javascript
module.exports = () => ({
    name: 'esbuild:plugin-test',
    setup(build) {
        build.onResolve({ filter: /^https?:\/\// }, args => {
            return {
                path: args.path,
                namespace: 'http-url'
            }
        });
    }
})
```
上述代码的作用是，当解析到以 `https` 或者 `http` 开头的模块时，将该模块的 `namespace` 设置为 `http-url`。需要注意的是，`onResolve` 是可以注册多个的，并且是串行执行的，如果当其中的某个`onResolve` 的 `callback` 返回了解析的结果（如上述代码示例），那么当前模块的解析就算完成了，此时其余的回调将不会被执行。
##### onLoad
`onLoad` 在加载模块阶段会被执行，使用的方式基本上和 `onResolve` 类似。
```javascript
module.exports = () => ({
    name: 'esbuild:plugin-test',
    setup(build) {
        build.onLoad({ filter: /.*/, namespace: 'http-url' }, async args => {
            return {
                contents:  '需要进行编译的模块内容'
            }
        }
    }
})
```
可以看到，在加载模块时，会对 `namespace` 为 `http-url` 的模块进行额外的处理。而之所以能够通过 `namespace` 来找到要解析的模块，是因为我们在上面的 `onResolve` 里，给模块设置了 `namespace` 。

与`onResolve` 不同，`onLoad` 需要返回 `contents`，之后 `esbuild` 将会对内容进行编译。当然也可以不返回，只是这样的化，`esbuild` 就会按照默认的方式根据路径去读取模块内容进行编译。

相同的地方在于，`onLoad` 也可以注册多次并且是串行的，在当前的 `onLoad` 如果返回了结果，那么后续的 `onLoad` 也将不会再被执行。
##### onEnd
`onEnd` 会在所有模块编译完成后执行，接收一个回调函数，该函数接收编译后的结果，如下代码示例以及编译结果
```javascript
module.exports = () => ({
    build.onEnd((buildResult) => {
        if (buildResult.errors.length) {
            return;
        }
        console.log(buildResult);
    })
});
```
![image](/public/buildTools/esbuild/6.png)
可以看到，最终的打包产物会在生成在 `dist/index.js` 这个文件内。
#### 小结
从 `onResolve` 到 `onLoad` 再到 `onEnd` ，描述了一个模块从解析到加载再到进行编译并且完成构建最终输出打包产物的过程。当然这个过程还有很多可以做的事情，只是这里为了追求能够以最简单的方式来描述，所以选择了省略。
### 写一个 CDN 依赖拉取插件
这个插件的目的在于，将 `import from URLs` 这种形式的模块，通过请求进行资源的获取再进行编译打包输出构建产物。
```javascript
// 需要进行编译的代码
import { render } from "https://cdn.skypack.dev/react-dom";
import React from 'https://cdn.skypack.dev/react'

let Greet = () => <h1>Hello world!</h1>

render(<Greet />, document.getElementById("app"));

```
对于上述代码，由于`esbuild` 本身无法像对支持 `ESM` 规范的浏览器那样对 `import from URLs` 形式的代码进行解析，所以可以理解为这个插件是在模拟浏览器解析 `ESM` 模块的过程。
```javascript
// htm-import-plugin.js
module.exports = () => ({
    name: 'esbuild:http',
    setup(build) {
        let https = require('node:https');
        let http = require('node:http');

        // 对 https 或者 http 开头的模块，将其 namespace 设置为 http-url
        build.onResolve({ filter: /^https?:\/\// }, args => {
            return {
                path: args.path,
                namespace: 'http-url'
            }
        });

        // 过滤出 namespace 为 http-url 的模块，通过 fetch api 来获取资源
        build.onLoad({ filter: /.*/, namespace: 'http-url' }, async args => {
            let contents = await new Promise((resolve, reject) => {
                function fetch(url) {
                    console.log(`Downloading: ${url}`);

                    let lib = url.startsWith('https') ? https : http;
                    let req = lib
                        .get(url, res => {
                            // 省略重定向或者非 200 的情况
                            if (res.statusCode === 200) {
                                let chunks = [];
                                res.on('data', chunk => chunks.push(chunk));
                                res.on('end', () => resolve(Buffer.concat(chunks)));
                            }
                        })
                }
                // 通过 fetch api 来获取资源
                fetch(args.path);
            });
            // 将请求的资源返回，后续由 esbuild 进行编译
            return { contents };
        });
    }
});

// build.js
const { build } = require('esbuild');
const htmlImportPlugin = require('./html-import-plugin');

function runBuild() {
    build({
        entryPoints: ['./src/index.jsx'],
        outdir: 'dist',
        plugins: [htmlImportPlugin()]
        ...
    })
}

runBuild();
```
尝试进行构建后，发现有如下的错误。这是因为当我们获取到 `https://cdn.skypack.dev/react` 以及 `https://cdn.skypack.dev/react-dom` 的资源后，`esbuild` 会继续对这两份资源进行编译，接着发现了资源内存在着 `/-/` 这种不符合规范的语法，因此报错了。
![image](/public/buildTools/esbuild/1.png)
在说明如何解决这个问题之前，需要先明确这个 `/-/` 是什么。这其实是[skypack.dev 的 resources-urls](https://docs.skypack.dev/skypack-cdn/api-reference/private-urls#resource-urls) ，是 `skypack.dev` 定义的一种结构，等价于`https://cdn.skypack.dev/-/xxxx`，因此对于这种类型的模块，在解析时，需要对模块的路径进行转换，也就是说，我们需要在 `onResolve` 里，去改造返回的 `path` 。如下代码示例：
```javascript
build.onResolve({ filter: /.*/, namespace: "http-url" }, (args) => {
    return {
        path: new URL(args.path, args.importer).toString(),
        namespace: "http-url",
    }
});
```
这里需要解答两个疑惑
- 在上面的代码里，明明只给 `https` 或者 `http` 开头的模块的 `namespace` 设置了 `http-url` ，为什么这里还能通过 `http-url` 过滤出 `/-/` 开头的模块呢？这是因为当我们在一个模块设置 `namespace` 时，该模块的子模块的 `namespace` ，也会被设置成同一个 `namespace` 。
- `new URL` 里的 `args.importer`是什么？实际上，当一个模块被加载时，`importer` 用来表示为当前模块是被哪个模块加载的。如下图：
![image](/public/buildTools/esbuild/3.png)
因此，我们只需要通过 `new URL` 将 `args.path` 和 `args.importer` ，就能够将原本的`path` 改造成我们期望的样子 `https://cdn.skypack.dev/-/react@v17.0.1-yH0aYV1FOvoIPeKBbHxg/dist=es2019,mode=imports/optimized/react.js`。
最终，在 `onLoad` 对模块进行加载的过程中，也就能够获取到资源继续往下编译了。那么到这里，这个插件的编写以及解读就结束了。如下图，可以看到成功把 `import from URLs` 类型的模块以及其依赖模块都获取下来并进行编译了。

![image](/public/buildTools/esbuild/5.png)

### 写一个简易 HTML 构建插件
`esbuild` 的打包结果里，并不包括构建一个 `html`页面，仅仅只是将构建产物输出出来，那么为了能够去使用这份构建产物，这里继续写一个根据产物来生成一个 `html` 页面的插件。关于构建产物的位置，在讲 `esbuild 的核心 hook`里提到，可以通过 `buildResult.metafile.outputs` 获取，因此该插件就能够据此来编写生成一个 `html` 页面
```javascript
const fs = require("fs/promises");
const path = require("path");
const { createScript, generateHTML } = require('./util');

module.exports = () => {
    return {
        name: "esbuild:html",
        setup(build) {
            build.onEnd(async (buildResult) => {
                // 构建失败就 return
                if (buildResult.errors.length) {
                    return;
                }
                // 获取 metafile
                const { metafile } = buildResult;
                const scripts = [];

                if (metafile) {
                    const { outputs } = metafile;
                    const assets = Object.keys(outputs);
                    // 将构建产物里的所有 js 文件 push 进数组
                    assets.forEach((asset) => {
                        if (asset.endsWith(".js")) {
                            scripts.push(createScript(asset));
                        }
                    });
                }
                // 构建 html 模板
                const templateContent = generateHTML(scripts);
                // 获取根目录的 index.html 文件路径
                const templatePath = path.join(process.cwd(), "index.html");
                // 将 html 模板根据路径写入到对应的文件里
                await fs.writeFile(templatePath, templateContent);
            });
        },
    };
}
  
// util.js
const createScript = (src) => `<script type="module" src="${src}"></script>`;
const generateHTML = (scripts, links) => `
<!DOCTYPE html>
<html lang="en">

<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Esbuild App</title>
</head>

<body>
  <div id="app"></div>
  ${scripts.join("\n")}
</body>

</html>
`;

module.exports = { createScript, generateHTML };
```
最终效果

![image](/public/buildTools/esbuild/4.png)

![image](/public/buildTools/esbuild/5.png)

### 总结
本文章的所有示例代码，均参考了掘金小册[《深入浅出 Vite》](https://juejin.cn/book/7050063811973218341)里第 9 节，我个人认为写的还是很好的，只是对于初学者可能消化起来会比较困难，因此我在学习过程中，把自己的一些思考和理解汇总成了本篇文章。
如果阅读完，能给您带来帮助，那将是我的荣幸。如果存在理解上的错误，也请多多指导，我会加以改进。