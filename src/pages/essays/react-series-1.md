---
layout: ../../layouts/BaseLayout.astro
title: 'useMemo 与 useCallback 解析'
pubDate: '2021.07.13'
author: 'Kobayashi'
tag: 'react'
isMarkdown: true
---

## 前言
作为 React 的使用者，在尝试对现有代码进行优化的时候，我们可能会尝试使用 `useMemo` 以及 `useCallback` 来进行优化，对`数据`或者`函数`进行缓存，在下次组件更新时，如果对应的`依赖`没有变化，就可以无须重新计算而拿到`缓存值`。

接下来，我会从 `使用` 以及 `原理` 两个角度来解析 `useMemo` 以及 `useCallback`

## 使用 useMemo、useCallback
```typescript
import React, { useState, useMemo, useCallback } from 'react'

function Demo () {
  const [count, setCount] = useState(0)
  const [isChanged, setIsChanged] = useState(false)
  
  // // useCallback 接收两个参数，一个是依赖发生变化时需要被执行的函数, 一个是依赖项
  const calDoubleCount = useCallback(() => {
    setCount(count => count + 1)
  }, [])

  // useMemo 接收两个参数，一个是依赖发生变化时需要被执行的函数, 一个是依赖项
  const doubleCount = useMemo(() => {
    return count * 2
  }, [count])
  
  return (
    <>
      <p onClick={() => setIsChanged(isChanged => !isChanged)}>change me</p>
      <p onClick={() => setCount(count => count + 1)}>{doubleCount}</p>
      <button onClick={calDoubleCount}>click me</button>
    </>
  )
}
```
上面这段代码描述了 `useMemo` 在实际开发中是如何使用的，我们通过点击第二个 `p` 标签改变 `count` 值，而 `doubleCount` 的依赖中存在 `count`, 所以当 `count` 变化时， `doubleCount` 会重新计算并且返回最新的值。

当点击第一个 `p` 标签时，因为并没有引起 `count` 的变化，所以 `doubleCount` 会使用上一次计算的值，而不是重新计算

## useMemo 源码剖析
在讲 `useMemo` 源码之前，有个前提是我们需要先了解清楚的，就是每次 `hook` 的执行我们可以分成两部分来看

1. mount
2. update
当第一次挂载组件时，走的是 `mount`, 之后的每一次组件渲染，走的都是 `update`。我们来看一段 `hook` 相关的源码。
```typescript
// mount
const HooksDispatcherOnMount: Dispatcher = {
  useCallback: mountCallback,
  useMemo: mountMemo,
  // 省略其他 hook
};

// update
const HooksDispatcherOnUpdate: Dispatcher = {
  useCallback: updateCallback,
  useMemo: updateMemo,
  // 省略其他 hook
};
```
从源码我们可以知道，`hook` 在首次执行时，执行的是 `HooksDispatcherOnMount`,在更新时，执行的是`HooksDispatcherOnUpdate`。了解了这个前提后，我们再看下面这段代码。
```typescript
// mount
HooksDispatcherOnMountInDEV = {
  useMemo<T>(create: () => T, deps: Array<mixed> | void | null): T {
    try {
      return mountMemo(create, deps);
    } finally {
      // 省略
    }
  }
}
// update
HooksDispatcherOnUpdateInDEV = {
  useMemo<T>(create: () => T, deps: Array<mixed> | void | null): T {
    try {
      return updateMemo(create, deps);
    } finally {
      // 省略
    }
  }
}
```
也就是说，`第一次` 挂载组件时调用的 `useMemo` ，实际上调用的是 `mountMemo`。之后的每次执行，调用的都是 `updateMemo`。
## mountMemo
```typescript
function mountMemo<T>(
  nextCreate: () => T,                                // 依赖变化时需要执行的函数
  deps: Array<mixed> | void | null,                   // 依赖
): T {
  const hook = mountWorkInProgressHook();
  const nextDeps = deps === undefined ? null : deps;
  const nextValue = nextCreate();
  hook.memoizedState = [nextValue, nextDeps];
  return nextValue;
}
```
`nextCreate` 实际上就是我们传入 `useMemo` 的第一个参数，是一个回调函数，当依赖更新时，该回调函数会被执行，`dep` 就是我们传入的第二个参数，是一个依赖数组。

可以看到，对于`第一次`挂载组件，`useMemo` 会直接执行 `nextCreat`,返回计算后的值。
而 `hook.memoizedState` 保存的是 `计算后的值` 以及对应的 `依赖`,目的是下次执行 `useMemo` 时，通过判断 `依赖` 是否变化来决定是返回重新计算的值，还是上一次计算的结果。
## updateMemo
```typescript
function updateMemo<T>(
  nextCreate: () => T,
  deps: Array<mixed> | void | null,
): T {
  const hook = updateWorkInProgressHook();
  const nextDeps = deps === undefined ? null : deps;
  // hook.memoizedState 就是 [value, deps]
  const prevState = hook.memoizedState;
  if (prevState !== null) {
    // 如果依赖不为空
    if (nextDeps !== null) {
      // 上一次更新后的依赖
      const prevDeps: Array<mixed> | null = prevState[1];
      // 比较当前与上一次的依赖
      if (areHookInputsEqual(nextDeps, prevDeps)) {
        // 如果两者依赖相等，直接返回上一次计算的结果
        return prevState[0];
      }
    }
  }
  // 否则重新计算依赖值
  const nextValue = nextCreate();
  // 将重新计算过后的值以及依赖赋值给 hook.memoizedState
  hook.memoizedState = [nextValue, nextDeps];
  return nextValue;
}
```
## useCallback
上面我们了解了 `useMemo` 的原理，那么 `useCallback` 也就很简单了。

`useCallback` 跟 `useMemo`，几乎一模一样，唯一的区别在于 `useMemo` 返回的是`函数计算的值`， 而 `useCallback` 返回的是`函数本身`

## mountCallback
```typescript
function mountCallback<T>(callback: T, deps: Array<mixed> | void | null): T {
  const hook = mountWorkInProgressHook();
  const nextDeps = deps === undefined ? null : deps;
  hook.memoizedState = [callback, nextDeps];
  // 直接返回函数本身
  return callback;
}
```
## updateCallback
```typescript
function updateCallback<T>(callback: T, deps: Array<mixed> | void | null): T {
  const hook = updateWorkInProgressHook();
  const nextDeps = deps === undefined ? null : deps;
  const prevState = hook.memoizedState; // [callback, deps]
  if (prevState !== null) {
    // 是否有依赖
    if (nextDeps !== null) {
      const prevDeps: Array<mixed> | null = prevState[1];
      // 对比当前依赖跟上一次计算后的依赖
      if (areHookInputsEqual(nextDeps, prevDeps)) {
        // 依赖如果一样这直接返回上次的缓存值
        return prevState[0];
      }
    }
  }
  hook.memoizedState = [callback, nextDeps];
  // 直接返回函数本身
  return callback;
}
```
通过以上对比我们可以知道 `updateCallback` 跟 `updateMemo` 的唯一区别就在于 `updateMemo` 在内部执行了回调函数，并将返回值返回。而`useCallback`则是直接把函数返回了，并没有计算。

## 总结
通过上面对 `useMemo` 以及 `useCallback` 的解析，我们了解到两者的区别其实很简单。改写的都写在上面了，但这里我最后想说一下。虽然 `useMemo` 跟 `useCallback` 都可以对数据进行缓存，但是也不能因此而滥用，我们应该考虑的是哪些数据值得去缓存，因为对于 `useMemo` 和 `useCallback` 来说，除了计算值耗时以外，对比依赖的变化也是需要时间的，我们应该对此进行衡量，才能够更好的去使用 `hook`，而不是为了优化而优化。