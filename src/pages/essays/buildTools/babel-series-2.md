---
layout: ../../../layouts/BaseLayout.astro
title: '如何写一个 babel 插件'
pubDate: '2023.08.14'
author: 'Kobayashi'
tag: 'Build Tools'
isMarkdown: true
---

### 前言
在 [认识 babel](/essays/buildTools/babel-series-1) 这篇文章里，我对 `babel` 做了一些相关的介绍。在这篇文章里，我希望能够以我在工作中实际编写的插件，来介绍如何编写一个 `babel` 插件。  

### 场景是什么？
工作期间，我负责开发了一个能够实时渲染前端代码的组件，逻辑很简单，分为三步：
1. 监听代码编辑器的变化事件
2. 将变化后的代码，塞入到 iframe 里
3. 由 iframe 来进行渲染

#### 问题是什么？
当输入的代码，出现死循环时，页面会直接卡死。比如：
```javascript
while (true) {}
```

#### 插件的功能是什么？
从问题描述上看，我们需要对输入的代码进行编译，对循环语句加一层封装，当循环语句的执行次数超过 `10000` 时，抛出异常。
```typescript
while (1) {
    // do something
}

// 转换成
let loopIt = 1

while (1) {
    loopIt += 1;

    if (loopIt > 10000) {
        throw 'error'
    }

    // do something
}
```


### 实现

#### 安装 @babel/core
在 [认识 babel](/essays/buildTools/babel-series-1) 里，我提到 `@babel/core` 是其他相关工具包的集合，所以直接通过 `@babel/core` 来编译就行。
```typescript
import * as babel from '@babel/core';

const code = `while (1) {}`;
const res = babel.transform(code, {
    plugins: [...]
})
```
这段代码的作用是，通过 `@babel/core` 提供的 `transform` 方法对 `code` 进行转换，转换过程中，使用配置的 `plugin`，最终返回转换后的代码 `res`。

#### babel 的插件格式
```typescript
const infiniteLoopPlugin = babel => {
    return {
        name: 'inifnite-loop-plugin',
        visitor: {
            // AST Node 的类型
            // path 指的是这个节点的路径
            WhileStatement (path) {
                // 对节点进行处理
            }
        }
    }
}
```
babel 的插件是一个接收 `babel` 参数的函数，并且返回两个属性：
 - name: 插件名称
 - visitor: 访问节点的对象
根据上面的代码，当我们写了一个 `while` 循环，那么在代码转换的过程中，在访问 `WhileStatement` 这个节点时，就会执行对应的 `enter` 函数，上面的简写形式等价于
```typescript
WhileStatement: {
    enter(path) {
        // do something
    }
}
```
那么同理，对于 `for` 和 `do while` 也是同样的写法
```typescript
const infiniteLoopPlugin = babel => {
   return {
        name: 'infinite-loop-plugin',
        visitor: {
            ForStatement(path) {},
            WhileStatement(path) {},
            DoWhileStatement(path) {}
        }
    } 
}

// 或者
const infiniteLoopPlugin = babel => {
   return {
        name: 'infinite-loop-plugin',
        visitor: {
            'ForStatement|WhileStatement|DoWhileStatement': (path) => {

            }
        }
    } 
}
```

那么现在已经知道了插件的结构，就可以开始对节点进行操作了。

### 实现步骤
1. 代码中可能存在多个循环，因此每个循环都需要有唯一的自增变量
2. 将自增变量插入节点的父级作用域 
3. 需要新增一段代码，用于在自增变量超出限制时抛出异常
4. 需要将代码添加到循环体里

```typescript
const infiniteLoopPlugin = babel => {
   return {
        name: 'infinite-loop-plugin',
        visitor: {
            'ForStatement|WhileStatement|DoWhileStatement': (path) => {
                /**
                 * scope 其实就是 JavaScript 基础知识里的词法作用域
                 * path.scope.parent 对应的就是这个节点的上一级作用域
                 * 比如：
                 * 
                 * 全局作用域 <--------------------- |
                 *                                 |
                 * for (let i = 0; i < 10; i++) {  | 
                 *      // 块级作用域 --------------|
                 * }
                 * 
                 * 所以这行代码的意思是，利用 generateUidIdentifier 这个 api，
                 * 以 loopId 为标识创建一个唯一变量。
                 */
                const loopIterator = path.scope.parent.generateUidIdentifier('loopIt');
                
                /**
                 * babel.types 实际上是 @babel/types 这个包
                 * 只是这里的 babel 用的是 @babel/core 这个集成了 @babel/types 的核心包
                 * 
                 * 这行代码的作用是创建一个整形变量，值为 0 
                 */
                const initLoopIterator = babel.types.numericLiteral(0);

                /**
                 * 给自增变量赋值
                 */
                path.scope.parent.push({
                    id: loopIterator,
                    init: initLoopIterator,
                });

                /**
                 * babel.template 对应的是 @babel/template，
                 * 至于 @babel/template 的作用，我在 “认识 babel” 已经介绍过，
                 * 这里不再解释
                 */
                const buildGuard = babel.template(`
                    // 判断循环的执行次数是否超出最大次数
                    if (LOOP_ITERATOR++ > MAX_LOOP_ITERATOR) {
                        var babel_global = typeof window === 'undefined' ? self : window;
                        // 定义异常错误
                        babel_global.infiniteLoopError = new RangeError('检测到代码中存在死循环');
                        // 抛出异常错误
                        throw babel_global.infiniteLoopError;
                    }
                `);

                // 替换掉模板里的占位符
                const guard = buildGuard({
                    LOOP_ITERATOR: loopIterator,
                    MAX_LOOP_ITERATOR: babel.types.numericLiteral(MAX_LOOP_ITERATOR),
                });

                /**
                 * 这里的 body 指的是循环体，比如：
                 * while (1) {}
                 * 这个花括号里的内容就是循环体
                 */
                const body = path.get('body');

                /**
                 * 循环有两种写法，比如：
                 * 1. while (1) { console.log(1) }
                 * 2. while (1) console.log(1)
                 * 
                 * 而 isBlockStatement，用于判断循环体是否有花括号
                 */
                if (!body.isBlockStatement()) {
                    const statement = body.node;
                    /**
                     * 没有花括号的情况, 使用 babel.types.blockStatement 创建一个带花括号的循环体，
                     * 并且把模板代码和原来循环体的内容塞入循环体内
                     */
                    body.replaceWith(babel.types.blockStatement([guard, statement]))
                } else {
                    /**
                     * 有花括号的情况，从 API 名称的 unshift 可以看出，直接把模板塞入循环体内。
                     */
                    body.unshiftContainer('body', guard);
                }
            }
        }
    } 
}
```

最后看下效果

```typescript
import * as babel from '@babel/core';

const code = `for (let i = 0; i < 10; i++) console.log(i)`

const res = babel.transform(code, {
    plugins: [infiniteLoopPlugin]
})

console.log(res.code);
```
![](/buildTools/1.png)

### 最后
对于 babel 来说，我需要说明的是，我对 babel 说不上熟悉，只是理解 babel 是什么，为什么需要它，以及能做什么事，但我认为这样就足够了。

对于文章内容里出现的一些 AST 节点，你可以在这里看到所有的节点类型 https://github.com/babel/babel/blob/master/packages/babel-parser/ast/spec.md#whilestatement。

如果你想要看到实际的 AST 结构，这个链接我想可以满足你 https://astexplorer.net/#/Z1exs6BWMq