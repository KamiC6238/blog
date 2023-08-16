---
layout: ../../../layouts/BaseLayout.astro
title: '认识 NodeJS'
pubDate: '2023.08.16'
author: 'Kobayashi'
tag: 'NodeJS'
isMarkdown: true
order: 1
---

在我的认知里，`JavaScript` 这门语言最早被创造出来的目的是为了能和浏览器里的页面进行交互。

但语言总归是语言，写出来的代码总是需要一个运行环境，换句话来说，需要有一个执行引擎，专门来执行用 `JavaScript` 编写的代码。说到这里，你可能会想起来 `Google chrome 的 V8` 引擎，这个 `V8` 引擎，实际上就是在 chrome 浏览器里，用来执行 `JavaScript` 代码的引擎，也可以认为 `V8` 引擎给 `JavaScript` 提供了一个运行环境。

对于一些没有尝试了解过 `JavaScript` 背景的人来说，大概会认为，`JavaScript` 只能够在浏览器上运行，没办法作为服务端语言来编写后端服务。

巧妙的地方在于，`V8` 引擎是独立于浏览器外的，这意味着即使不在浏览器里，也可以使用 `V8` 来执行 `JavaScript` 代码，这也为 `NodeJS` 的诞生创造了条件。

简单的来讲，`NodeJS` 基于 `V8` 同样提供了一个 `JavaScript` 的运行时环境，使得开发者们能够使用 `NodeJS` 来编写服务端代码。而之所以能够这样则是因为 `NodeJS` 底层还使用了 `libuv`，一个使用 `C` 开发的基于事件驱动的跨平台异步 IO 库，具体的介绍可以看 https://en.wikipedia.org/wiki/Libuv

最后，其实 `NodeJS` 的官网已经说了它是一个 `JavaScript runtime environment`，但我想也许只有去了解其背后的一些故事，才能够有更加深刻的理解。