---
layout: ../../layouts/BaseLayout.astro
title: '环境变量与模式'
pubDate: '2023.05.26'
author: 'Kobayashi'
tag: 'vite'
isMarkdown: true
---

### 前言

本文会基于笔者工作中实际遇到的场景，来讲述 `@unocss/preset-icons` 中的环境变量的模式应该如何使用。本文包含下列内容：

* 应用场景
* 环境变量是什么
* 模式是什么
    *   如何设置模式
    *   如何获取模式
    *   如何配置环境变量
*   环境变量和变量如何配合使用

### 应用场景

笔者在工作中，有这么一个需求：

1.  起一个新项目
2.  开发完成后，对项目进行打包
3.  将打包后的资源上传到公司的 CDN，需要区分不同的环境，比如 `开发环境(dev)`、`预发布环境(pre)`、`生产环境(prod)`
4.  在业务场景，将该资源引入作为 iframe 的 src 进行使用

### 环境变量是什么

环境变量，指的是项目的部署环境，比如开发环境、预发布环境以及生产环境，当然可能还有其他比如灰度环境，这个就不在介绍范围内了。

### 模式是什么

在 `Vite` 里，模式即 `mode` ，表示启动服务或者构建项目时所使用的模式。

#### 如何设置模式

以下列代码段为例子：

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "build:dev": "tsc && vite build --mode dev",
    "build:pre": "tsc && vite build --mode pre",
    "build:prod": "tsc && vite build --mode prod"
  }
}
```

执行 `yarn dev` 时，`Vite` 内部会将 `mode` 设置为 `development`

执行 `yarn build` 时，`Vite` 内部会将 `mode` 设置为 `production`；

当然，`mode` 是可配置的。可以看到剩下的三条指令里，都在最后通过 `--mode xxx` 的方式对 `mode` 进行了配置。也就是说，如果执行 `yarn build:dev`，那么 `mode` 将会变成 `dev`，以此类推。

#### 如何获取模式

下列代码段是一个最简单的 `vite.config.ts` 的配置:

```typescript
import { defineConfig, ConfigEnv } from 'vite'
import react from '@vitejs/plugin-react';

export default defineConfig(({mode}: ConfigEnv) => {
    return {
        plugins: [react()],
        build: {
          outDir: 'dist'
        }
    }
})
```

需要了解的是，`defineConfig` 支持传入一个函数，并且该函数接收一个对象，我们可以从该对象内获取到当前的模式，也就是 `mode`

#### 如何配置环境变量

`Vite` 提供了一个 `loadEnv` 的方法，用于读取`指定目录`下的以 `.env` 开头的文件。以我个人实际使用场景为例，有以下几种类型：

1.  `.env.dev`
2.  `.env.pre`
3.  `.env.prod`

在不同的 `.env.[mode]` 文件配置里，我们可以指定一些环境变量，比如

    // .env.dev
    // 需要注意的是，定义的变量需要以 VITE_ 开头，否则不会被识别
    VITE_DEPLOY_ENV=dev

## 环境变量和模式如何配合使用

在前面几小节的内容里，我们认识了 `mode` 是什么，和如何设置和获取 `mode`，以及如何设置环境变量。
那么这小节，会介绍环境变量以及 `mode` 是如何搭配使用的。

#### 环境变量的目录结构

以我在实际项目中的目录结构举例：

![image.png](/vite-1/1.png)

每个文件的环境变量配置

![image.png](/vite-1/2.png)

```typescript
// vite.config.ts
import { defineConfig, ConfigEnv, loadEnv } from 'vite'
import react from '@vitejs/plugin-react';

export default defineConfig(({mode}: ConfigEnv) => {
    // 根据 mode 获取对应的环境变量
    const envData = loadEnv(mode, './env');
    
    // 打印结果
    console.log(envData)

    return {
        plugins: [react()],
        build: {
          outDir: 'dist'
        }
    }
})
```

#### 实践

有了前面的铺垫，让我们来开始实践吧。打开控制台，在项目根目录下执行 `yarn build:dev`

![image.png](/vite-1/3.png)

可以看到，我们打印出来的 `envData` 是一个对象，并且有一个属性为 `VITE_DEPLOY_ENV` ，值为 `dev` 。这个结果，也正是我们在 `.env.dev` 文件里配置的环境变量。

到这一步后，我们已经明白了 `mode` 与环境变量是如何搭配一起使用的，基于此我们就可以做更多的事情了。还记得笔者的应用场景是什么吗？就是构建时资源要区分环境，接着上传到公司内部的 CDN 服务上。那么应该怎么做呢？

假设资源最终的访问地址为 `https://static.kobayashi.com/${env}/index.html`，那么我们可以这么做：

```typescript
// vite.config.ts
import { defineConfig, ConfigEnv, loadEnv } from 'vite'
import react from '@vitejs/plugin-react';

export default defineConfig(({mode}: ConfigEnv) => {
    // 根据 mode 获取对应的环境变量
    const envData = loadEnv(mode, './env');
    const env = envData.VITE_DEPLOY_ENV;
    const base = `https://static.kobayashi.com/${env}/`

    return {
        plugins: [react()],
        base,
        build: {
          // 构建结果输出到当前目录的 dist 目录下
          outDir: 'dist'
        }
    }
})
```
假设我们要构建 `dev` 环境的产物，那么就执行 `yarn build:dev`，下图为构建结果

![image.png](/vite-1/4.png)

最后，我们只需要把相关的资源都上传到公司内部的存放静态资源的服务即可。这样我们就完成了将资源区分不同环境进行上传。

### 总结
如果这对你有帮助，不妨点个赞支持一下笔者。

如果文章存在错误，也欢迎指出，我会及时订正。

感谢你读到这里。

