---
layout: ../../../layouts/BaseLayout.astro
title: '认识 babel'
pubDate: '2023.08.15'
author: 'Kobayashi'
tag: 'Build Tools'
isMarkdown: true
---
### babel 是什么？
babel 是一个 JavaScript compiler，也可以叫 transpiler，因为 babel 本质上是在做的事情是 source-to-source，也就是将一份代码转换成另一份代码。

### 为什么要使用 babel?
babel 的作用有很多，举例来说，对于不同的浏览器而言，对 ES 标准的支持程度也不同，比如一个新的语法在 chrome 支持，但在 IE 不支持，那么代码在 IE 浏览器上就会报错。那么在这个场景下，babel 会将代码进行语法降级，使其在不同浏览器下都能够正常运行。

除此之外，babel 能做的事情还有很多，比如`代码优化（删掉没有用到的代码）`、`代码压缩（删掉换行符，空格等等）`、`语法检测`。这都是基于 babel 能够对代码进行静态分析，而能够进行静态分析的最大功臣，要归功于 `AST` (抽象语法树)

现在回到问题，为什么要使用 babel？
1. 在项目层面上，babel 能够帮助我们对代码进行优化
2. 在用户层面上，babel 能够对代码进行语法降级，兼容不同的浏览器。

### babel 的三个核心步骤
1. parse 对代码进行解析，转成 `AST`
2. traverse 对 AST 进行遍历，在这个过程中，可以新增 `AST` Node，也可以对其进行修改或着删除
3. 对新的 `AST` 转换成代码，还有对应的 source map

### AST 是什么 ？
`AST` 的全称是 `Abstract syntax tree`，也就是抽象语法树。`AST` 是有规范的，具体的规范可以在这里看到 https://github.com/estree/estree

个人认为，对于开发者而言，只需要认识到 AST 是一种基于 `estree` 规范来来描述代码的节点树即可。而之所以这么做，是因为将变量或者表达式等等转换成节点后，更方便开发者对节点进行增删改。

### babel 相关的工具包

#### @babel/parser
用于将代码转换为 `AST` 结构。

```javascript
import { parse } from '@babel/parse';

const code = `function foo() {}`
const ast = parse(code);
```

#### @babel/traverse
用于递归遍历 `AST`，对于每一个 `AST Node`，都会对应的两个方法 `enter` 和 `exit`，也就是说，对于每一个节点，我们会有两次访问机会，一个是进入节点时，一个是离开节点时。

知道了这一点后，也就不难理解为什么说是一个递归的遍历过程了。
```javascript
import { parse } from '@babel/parser';
import traverse from '@babel/traverse';

const code = `function foo() {}`
const ast = parse(code);

traverse(ast, {
    // 进入节点
    enter() {},
    // 离开节点
    exit() {}
})
```
当然这么写的话，实际上每个节点都会执行 `enter` 和 `exit`，如果我们只希望访问某些特定的 `AST Node`，可以根据 AST 的节点规范，找到你想要的节点进行访问，比如：
```javascript
traverse(ast, {
    Identifier: {
        enter() {},
        exit() {}
    }
})

// 或者
traverse(ast, {
    /**
     * 等价于 
     * Identifier: {
     *      enter() {}
     * }
     */
    Identifier() {}
})
```

#### @babel/generator
用于将 `AST` 转回源代码
```javascript
import { parse } from '@babel/parser';
import generate from '@babel/generator';

const code = `function foo() {}`
const ast = parse(code);
const sourceCode = generate(ast);
```

#### @babel/types
用于手动构建或者验证 `AST Node`

#### @babel/template
允许编写带有占位符的字符串代码，而不是通过构建大量的 AST 来生成代码。
在遍历 AST 的过程中，有些情况下，我们希望在原来的代码基础上做一些新增，比如给 async await 包一层 try catch。
如果没有 `@babel/template`，这意味着我们需要手动来构建 try catch 的 AST 结构，但对于使用方的开发者来说，其实并不应该关心这些，
而 `@babel/template` 就是为了解决这种情况而存在的。

### 最后
其实还有一个没提到，就是 `@babel/core` 这个库包含了上述提到的所有工具包，所以可以用 `@babel/core` 来做代码编译，也可以单独安装工具包。

#### babel 学习推荐读物
https://github.com/jamiebuilds/babel-handbook/blob/master/translations/en/plugin-handbook.md