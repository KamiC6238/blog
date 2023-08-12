---
layout: ../../layouts/BaseLayout.astro
title: '使用 React + IntersectionObserver 实现图片懒加载'
pubDate: '2021.06.22'
author: 'Kobayashi'
tag: 'React'
isMarkdown: true
---

> 图片懒加载原理

1. 图片是否进入可视区域
2. 将图片的具体地址暂存到 `data-src` 属性
3. 图片进入可视区域后，将 ```img``` 标签的 `data-src` 的属性值赋值给 `src` 属性

> IntersectionObserver

用于观察元素是否进入可视区域，具体介绍可以看阮一峰老师的文章http://www.ruanyifeng.com/blog/2016/11/intersectionobserver_api.html

> 源码可以通过复制下列链接进入
```
https://github.com/KamiC6238/toys/blob/main/init/src/pages/photo-wall/intersection-lazyload.tsx
```

具体效果可以复制 codesandbox 链接查看：
```
https://codesandbox.io/s/brave-jepsen-y5ji7?file=/src/App.tsx
```

```typescript
import React, { FC, memo, useEffect, useRef } from 'react'

// CSS IN JS 的样式
import { Container, ImageWrapper, Image } from './style'
// 用到的图片，类型是 string[]
import { lazyloadImages } from './utils'

export const IntersectionObserverLazyload: FC<{}> = memo(() => {
  const observerRef = useRef(new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      const { target, intersectionRatio } = entry
        
      // target 为具体的 dom
      // intersectionRatio 范围为 0 ~ 1, 0 为完全不可见， 1 为完全可见
      // 因此只需判断当 intersectionRatio 大于 0 即可
      if (intersectionRatio > 0) {
        const _target = target as HTMLImageElement
        _target.src = _target.dataset['src'] ?? ''

        _target.onload = () => {
          _target.style.opacity = '1'
        }

        observerRef.current.unobserve(_target)
      }
    })
  }))

  useEffect(() => {
    Array
      .from(document.getElementsByTagName('img'))
      .forEach((img) => observerRef.current.observe(img))

    return () => {
      observerRef.current.disconnect()
    }
  }, [])

  return (
    <Container>
      {lazyloadImages.map((image, index) => (
        <ImageWrapper key={index}>
          <Image
            src={undefined}
            data-src={image}
            alt={`${index}`}
            style={{ opacity: '0', transition: '.3s' }}
          />
        </ImageWrapper>
      ))}
    </Container>
  )
})
```