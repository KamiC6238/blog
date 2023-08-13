---
layout: ../../../layouts/BaseLayout.astro
title: 'TypeScript项目实践之 Omit 特性'
pubDate: '2020.07.24'
author: 'Kobayashi'
tag: 'TypeScript'
isMarkdown: true
---

> 前言

入职两个月以来每天都在接触 ```TypeScript```，但其实用的还不是很好，经常踩坑。所以我接下来也会尝试着更新自己该系列文章，目的是除了巩固总结自己的所学之外，也希望能够帮助到正在学习```TypeScript```但没有在真实项目实践中使用过```TypeScript```的人们。

> Omit 介绍

```Omit```的中文意思是 **忽略** ，是 `TypeScript 3.5` 版本推出的特性，以下是官网的介绍

    TypeScript 3.5 添加了新的 Omit 辅助类型，这个类型用来创建从原始类型中移除了某些属性的新类型。
    
因为是我想写的主要是在真实项目中对于该特性的**实践**，因此官网里的例子我就不列举了。

> 需求介绍

因为我所在小组负责的是偏向企业服务的，类似于后台管理，因此会遇到很多的 `Table`, 采用的 UI框架是 `ant-design`, 所以我会列举一个。

现在我们需要对表格做一个**筛选功能**，这会用到`ant-desigh`里`Table`的`filterDropdown`属性，如下图所示：

![](https://p1-jj.byteimg.com/tos-cn-i-t2oaga2asx/gold-user-assets/2020/7/24/173813162fcfee86~tplv-t2oaga2asx-image.image)

那么如何使用呢，还是看下面的代码吧：
```javascript
  {
    title: 'Age',
    dataIndex: 'age',
    key: 'age',
    filterType: true,
    filterDropdown: ({ confirm, selectedKeys, setSelectedKeys }) => (
      <DropDownList
        confirm={confirm}
        selectedKeys={selectedKeys}
        setSelectedKeys={setSelectedKeys}
      />
    ),
  }
```
```filterDropdown``` 可以的值可以是一个函数，其中注意到其参数的 `props` 的类型是 ```FilterDropdownProps```, 这是个什么东西呢，我们进去源码看看：

```javascript
export interface FilterDropdownProps {
    prefixCls: string;
    setSelectedKeys: (selectedKeys: React.Key[]) => void;
    selectedKeys: React.Key[];
    confirm: () => void;
    clearFilters?: () => void;
    filters?: ColumnFilterItem[];
    visible: boolean;
}
```

可以看到```FilterDropdown```有很多的属性, 其中有 ```selectedKeys``` 和 ```setSelectedKeys```, 这也就是为什么我们在上面使用 ```filterDropdown``` 的时候可以通过解构赋值拿到 ```selectedKeys``` 和 ```setSelectedKeys```。

> 注意点

我们看到 ```setSelectedKeys```，其参数类型是 ```React.Key[]``` 类型的，

![](https://p1-jj.byteimg.com/tos-cn-i-t2oaga2asx/gold-user-assets/2020/7/24/173813ba001de1b1~tplv-t2oaga2asx-image.image)
通过上图可以发现，这个 ```setSelectedKeys``` 只能接收一个 ```string``` 或者 ```number``` 类型的数组。

那如果我们在需求里遇到了要用```string```或者```number```类型之外的类型怎么办？

> Omit 用法

上面介绍的时候提到，`Omit` 的意思是忽略，在这里，我们应该理解为 `Omit` 可以忽略某个类型的某些属性，假设我们现在想要让 ```setSelectedKeys``` 跟 ```selectedKeys``` 能接收一个非```string``` 或者 ```number``` 类型的数组，那么我们只需使用 ```Omit``` **忽略** 这两个属性，然后我们自己给这两个属性赋值新的类型是不是就可以了？

> Omit <T, K>

其中 `T` 是 `type`也就是类型的简写， `K` 是 `key` 的简写，所以这里的意思就是**忽略**该类型的`key`属性

```
import { FilterDropdownProps } from 'antd/es/table'

type TagProps = {
    slug: string
    name: string
}

type MyFilterDropdownProps = Omit<FilterDropdownProps, 'selectedKeys' | 'setSelectedKeys'> & {
    selectedKeys: TagProps
    setSelectedKeys: (selectedKeys: TagProps[]) => void
}
```

上面这段代码，先看左边 ```Omit<FilterDropdownProps, 'selectedKeys' | 'setSelectedKeys'>```, 这里的意思就是要**忽略** ```FilterDropdownProps``` 的 `selectedKeys` 和 `setSelectedKeys` 属性，然后我们还做了一步**最重要的操作**，就是通过 `&` 符号将我们**自己定义的** `selectedKeys` 和 `setSelectedKeys` 和 ```FilterDropdownProps``` 剩下的属性组合起来了，最后再赋值给 `MyFilterDropdownProps` 类型。

那么这个时候，我们就已经将```FilterDropdownProps```里的 `selectedKeys` 和 `setSelectedKeys` 改造成了我们希望能够接收的类型。

> 还没结束

我相信用过```filterDropdown```这个属性的同学，一定都知道该属性是在 ```column``` 中使用的，`column`是一个对象数组，每一个对象代表一列，既然```filterDropdown```是用在`column`中的，那么我们最后要做的就是把`column`中的`filterDropdown`属性替换成我们自己定义的类型即可。

在此之前，我们先看看`column`里有哪些属性，上源码：

![](https://p1-jj.byteimg.com/tos-cn-i-t2oaga2asx/gold-user-assets/2020/7/24/1738153889b7bc64~tplv-t2oaga2asx-image.image)

可以看到，这个`ColumnType`就是`column` 数组中每个对象可以使用的属性，其中就有 `filterDropdown` 属性，所以我们最后一步操作如下代码：

```javascript
import React, { FC } from 'react'
import { ColumnType, FilterDropdownProps, TableProps } from 'antd/es/table'

type TagProps = {
    slug: string
    name: string
}

type MyFilterDropdownProps = Omit<FilterDropdownProps, 'selectedKeys' | 'setSelectedKeys'> & {
    selectedKeys: TagProps
    setSelectedKeys: (selectedKeys: TagProps[]) => void
}

// 注意这里原来的 FilterDropdownProps 已经被替换成我们自定义的 MyFilterDropdownProps
type MyColumnType<T> = Omit<ColumnType<T>, 'filterDropdown'> & {
    filterDropdown?: React.ReactNode | ((props: MyFilterDropdownProps) => React.ReactNode);
}

// 又因为 column 是 Table 的属性
type MyTableProps<T> = Omit<TableProps<T>, 'column'> & {
    columns?: MyColumnType<T>;
}

type User = {
    //
}

// MyTable 可以像普通的Table 一样使用, 因为其类型是我们改造过的 TableProps
// 因此 Table 可以接收的属性 MyTable 也同样可以接收
const MyTable: FC<MyTableProps<User>> = (props) => {
    const { xxx, xxx, xxx, ...restProps } = props
    
    const columns: MyColumnType<User>[] = [{
        //,
        //,
        filterDropdown: ({selectedKeys, setSelectedKeys}) => {
            // 此时的 selectedKeys 跟 setSelectedKeys 接收的类型已经被改造成 TagProps 了
            // 而不是 antd table 定义的类型了
        })
    }]
    
    return <Table {...restProps} columns={columns} />
}
```

其实到这里，关于 `Omit`的用法就讲完了，我想通过上面这几段代码，应该可以很好的说明`Omit`在实践当中是如何使用的。

    谢谢观看小弟的文章，希望对各位有帮助。

