---
layout: ../../../layouts/BaseLayout.astro
title: 'react-router(V5) 解析'
pubDate: '2021.06.28'
author: 'Kobayashi'
tag: 'React'
isMarkdown: true
---

> 前言

写这篇文章主要是想加深自己对 `react-router` 的理解，但看了源码之后，发现源码与现在的一些文章写的不太一样了，可能是版本不同的原因，所以这里我根据最新的 `react-router` 进行了一次解析，如果有疏漏或者错误的问题，还请大家嘴下留情，多多指点。

# createBrowserHistory

该方法存在于第三方库 `history` 里，对 `window.history` 做了功能上的增强。

```typescript
export function createBrowserHistory (
  options: BroswerHistoryOptions = {}
): BrowserHistory {
  let { window = document.defaultView! } = options;
  
  // 用于进行事件监听
  let listeners = createEvents<Listener>();
  
  // 可以看到 createBrowserHistory 的实现用到了 window.history
  let globalHistory = window.history;
  
  function applyTx(nextAction: Action) {
    action = nextAction;
    [index, location] = getIndexAndLocation();
    
    // 当 location 发生变化时，在 Router 源码内部对 location 进行 setState
    listeners.call({ action, location });
  }
  
  function push (...) {
    // 省略了部分代码
    ...
    try {
      globalHistory.pushState(historyState, '', url);
    } catch (error) {
      window.location.assign(url);
    }
    applyTx(nextAction);
  }
  
  function replace (...) {
    // 省略了部分代码
    ...
    globalHistory.replaceState(historyState, '', url);
    applyTx(nextAction);
  }
  
  let history: BrowserHistory = {
    ...
    // 给原本的 window.history 加上了 listen
    // 用于监听 window.location 的变化
    // 当 window.location 发生变化时，执行对应的回调函数
    listen(listener) {
      return listeners.push(listener);
    },
    ...
  };

  return history;
}
```

我们可以看到，`BrowserHistory` 的 `push` 以及 `replace` 实际上用的是 `HTML5` 提供的 `pushState` 以及 `replaceState`，这两个 api 都不会引起页面的刷新，只会更改路由，所以这也使得单页应用成为了可能。

当然核心在于 `applyTx` 这个方法，当我们使用 `push` 或者 `replace` 的时候，都会调用 `applyTx`, 通过这个方法去调用监听了 `location` 的回调函数（该回调函数可以在下面 `Router` 的源码中看到）

# createHashHistory 

其实跟 `createBrowserHistory` 没有太大的区别，本质上还是通过 `pushState` 以及 `replaceState` 来进行路由的更改，只是在监听以及更改路由的过程中，多了一些额外的操作。

```typescript
export function createHashHistory(
  options: HashHistoryOptions = {}
): HashHistory {
   // 与 createBrowserHistory 不同，createHashHistory 还对 hashchange 事件进行了监听
   window.addEventListener('hashchange', () => {
    ...
  });
  
  function createHref(to: To) {
    // 注意到 hashHistory 其实只是在创建路由的时候多拼了一个 '#' 而已
    return getBaseHref() + '#' + (typeof to === 'string' ? to : createPath(to));
  }
}
```

# react-router

我们在编写路由的时候，会引入 `BrowserRouter` 或者 `HashRouter`。我们来看看这两个 `Router` 是怎么实现的。

# BrowserRouter 源码

```typescript
import React from "react";
import { Router } from "react-router";
import { createBrowserHistory as createHistory } from "history";

class BrowserRouter extends React.Component {
  // 可以看到内部是借助了 history 这个第三方库帮我们创建 history
  // 因为是 BrowserRouter, 所以这里的 createHistory 指的是 createBroswerHistory
  history = createHistory(this.props);

  render() {
    // 最后将 history 以及对应的子组件 children (Route) 传给 Router
    return <Router history={this.history} children={this.props.children} />;
  }
}

// 这里省略了部分代码
...

export default BrowserRouter;
```

# HashRouter 源码

其实跟 `BrowserRouter` 基本是一致的，有兴趣可以去看一下源码

> Router 的源码实现

```
class Router extends React.Component {
  constructor(props) {
    super(props);
    
    // 初始化 localtion
    // 这里的 history 实际上就是从 BrowserHistory 传下来的增强过的 history (带有 listen 功能)
    this.state = {
      location: props.history.location
    };

    this._isMounted = false;
    this._pendingLocation = null;
    
    // 这里在 constructor 阶段就对 location 进行监听
    // 是因为页面在挂载之前就有可能已经通过 <Redirect /> 进行重定向了 
    if (!props.staticContext) {
      // 这里对 location 进行订阅，当 location 发生变化的时候对 location 进行 setState
      this.unlisten = props.history.listen(location => {
        if (this._isMounted) {
          this.setState({ location });
        } else {
          this._pendingLocation = location;
        }
      });
    }
  }
  
  componentDidMount() {
    this._isMounted = true;

    // 如果没有被重定向，那么在页面挂载完成后将 location 保存到 this.state 中
    if (this._pendingLocation) {
      this.setState({ location: this._pendingLocation });
    }
  }
  
  // 省略了部分代码
  ...
  
  render() {
    return (
      // 这里使用了 context 来保存数据
      <RouterContext.Provider
        value={{
          history: this.props.history,
          location: this.state.location,
          match: Router.computeRootMatch(this.state.location.pathname),
          staticContext: this.props.staticContext
        }}
      >
        // 使用 context 保存数据
        <HistoryContext.Provider
          children={this.props.children || null}
          value={this.props.history}
        />
      </RouterContext.Provider>
    );
  }
}
```

# Route 的源码实现

讲完了 `Router` ，接下来就是 `Route` 了，我们在编写路由的过程中，都会把 `<Route>` 作为 `<Router>` 的子组件，当然事实上如果不这样做是会报错的

> 基本的 `<Route />` 使用

```
<Router>
  <Route path={path} component={component} />
</Router>
```

在看看 `Route `的源码实现

```typescript
class Route extends React.Component {
  render () {
    // 使用了 RouterContext.Consumer
    // 这样 Route 就能够拿到上层的 Router 通过 RouterContext.Provider 传下来的数据了
    <RouterContext.Consumer>
      {context => {
        ...
        // 如果我们在使用 <Route> 的时候没有传 location 参数，那么就会使用 context.location
        const location = this.props.location || context.location;  
        
        const match = this.props.computedMatch
          ? this.props.computedMatch 
          : this.props.path
          // 这里 matchPath 用来对比 location 与 <Route> 组件上的 path 属性
          ? matchPath(location.pathname, this.props)
          : context.match;
        ...
        
        // match 是一个 object | null 类型的数据
        // 如果 match 是 object, 会以以下格式返回
        // { path, url, isExact, params }
        // 其中 path 就是 <Route path={path} /> 里的 path
        
        return (
          <RouterContext.Provider value={props}>
            // 对于匹配到的 Route
            {props.match
              ? children
                ? typeof children === "function"
                  ? __DEV__
                    ? evalChildrenDev(children, props, this.props.path)
                    : children(props)
                  : children
                // 如果 Route 只配了 component 并且没有 children
                // 就会渲染 <Route component={component} /> 上的 component
                : component
                
            // 省略了部分代码
            ...
            </RouterContext.Provider>
          );
      }}
    </RouterContext.Consumer>
  }
}
```

# 总结

1. `react-router` 是基于第三方库 `history` 实现的
2. `history` 对原生的 `window.history` 进行了增强，使得增强后的 `history` 具备了对 `location` 的监听能力 
3. `BrowserRouter` 以及 `HashRouter` 帮我们创建了对应的 `history` 并传入 `Router`
3. `Router` 对 `location` 进行了监听，将 `location` 保存在 `state` 中，在 `location` 发生变化时进行 `setState` 
4. `<Route>` 在 `location` 发生变化时，根据自身配置的 `path` 属性去与 `location` 进行匹配，将匹配成功的组件进行渲染。

其实我觉得 `react-router` 本质上就是发布订阅模式的一种应用场景。通过第三方库`history`来进行 `location` 变化的发布，而 `react-router` 去订阅 `location` 的变化，从而在 `location` 变化的过程中重新渲染组件。 