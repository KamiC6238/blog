---
layout: ../../../layouts/BaseLayout.astro
title: '谈谈 babel'
pubDate: '2023.08.14'
author: 'Kobayashi'
tag: 'Build Tools'
isMarkdown: true
---
1. babel 是什么？
babel 是一个 JavaScript compiler，也可以叫 transpiler，因为 babel 本质上是在做的事情是 source-to-source，也就是将一份代码转换成另一份代码。

2. 为什么要使用 babel?
babel 的作用有很多，举例来说，对于不同的浏览器而言，对 ES 标准的支持程度也不同，比如一个新的语法在 chrome 支持，但在 IE 不支持，那么代码在 IE 浏览器上就会报错。那么在这个场景下，babel 会将代码进行语法降级，使其在不同浏览器下都能够正常运行。

除此之外，babel 能做的事情还有很多，比如代码优化（删掉没有用到的代码）、代码压缩（删掉换行符，空格等等）、语法检测。这都是基于 babel 能够对代码进行静态分析，而能够进行静态分析的最大功臣，要归功于 AST (抽象语法树)

现在回到问题，为什么要使用 babel？
1. 在项目层面上，babel 能够帮助我们对代码进行优化
2. 在用户层面上，babel 能够对代码进行语法降级，兼容不同的浏览器。

babel 的三个核心步骤
1. parse 对代码进行解析，转成 AST
2. traverse 对 AST 进行遍历，在这个过程中，可以新增 AST Node，也可以对其进行修改或着删除
3. 对新的 AST 转换成代码，还有对应的 source map

@babel/template
允许编写带有占位符的字符串代码，而不是通过构建大量的 AST 来生成代码。
在遍历 AST 的过程中，有些情况下，我们希望在原来的代码基础上做一些新增，比如给 async await 包一层 try catch。
如果没有 @babel/template，这意味着我们需要手动来构建 try catch 的 AST 结构，但对于使用方的开发者来说，其实并不应该关心这些，
而 @babel/template 就是为了解决这种情况而存在的。

babel 学习推荐读物
https://github.com/jamiebuilds/babel-handbook/blob/master/translations/en/plugin-handbook.md