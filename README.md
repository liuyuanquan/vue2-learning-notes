## 前言

用过 React 或者 Vue 的同学都知道，这两个框架之所以性能这么好，底层都基于 Virtual DOM 这么一个东西。Virtual DOM 实际上就是内存中的一个JS对象，它是真实的 DOM 树在内存中的一个映射。

了解过浏览器渲染页面过程的同学都知道，当我们改变一个节点属性的时候，页面会发生 repaint 或者 reflow，而这种操作其实是十分耗性能的。为了提高渲染效率，我们可以先在内存中比较前后两颗 Virtual DOM 的差异，然后只把差异的部分渲染到 DOM 树上，这样可以减少一大部分不必要的 DOM 操作，提高性能。

接下来我们带着大家从零到一实现一个 Virtual DOM 算法。

> VNode 和 Virtual DOM 其实是一个东西，后续都会用 VNode 来指代 Virtual DOM。

## 1. 如何表示一个 VNode 对象

我们都知道一个 VNode 对象是 DOM 树在内存中的映射，那么我们的真实 DOM 有哪些属性，我们的 VNode 就应该有哪些属性。这里为了方便大家理解，暂时先省去 DOM 节点所具有的 attr、prop 和 事件监听器，只具有 text 和 children 属性。后续会再出一篇文章来实现一个完整的 VNode。

假如 DOM 结构如下所示：

```js
<ul>
  <li>Item 1</li>
  <li>Item 2</li>
  <li>Item 3</li>
</ul>
```

我们可以很容易定义一个 VNode 类来描述上述结构。

```js
// vnode.js
export default class VNode {
  constructor(
    tag,  // 标签名
    children, // 孩子 [VNode, VNode]
    text,     // 文本节点
    elm,      // 对应的真实 dom 对象
  ) {
    this.tag = tag
    this.children = children
    this.text = text
    this.elm = elm
  }
}
```

在写一个简单的工厂函数。

```js
import VNode from 'vnode'

// 创建非文本节点
const c = (tag, children) => {
  return VNode(tag, children, '')
}

// 创建文本节点
const t = text => {
  return VNode(null, [], text)
}
```

然后上述的 DOM 结构就可以表示成：

```js
const ul = c('ul', [
  c('li', [ t('Item 1') ]),
  c('li', [ t('Item 2') ]),
  c('li', [ t('Item 3') ]),
])
```

## 2. 根据 VNode 渲染出真实的 DOM 

如下图，我们该如何根据左边的 VNode 渲染出 右边真实的 DOM 呢？

![VNode树渲染成Dom树.png](http://ttc-tal.oss-cn-beijing.aliyuncs.com/1583659218/vnode2dom.png)

我们的思路如下：

![VNode树渲染成Dom树流程.png](http://ttc-tal.oss-cn-beijing.aliyuncs.com/1583659173/vnode2domFlow.png)

用代码描述这个过程：

```js
// patch.js

/**
 * 创建 vnode 对应的 dom 节点，并插入到 parentElm 内部
 * @param {*} vnode 
 * @param {*} parentElm 
 * @param {*} refElm 
 */
function createElm (vnode, parentElm, refElm) {
  const {tag, children, text} = vnode
  if (isDef(tag)) { // 非文本节点
    vnode.elm = nodeOps.createElement(tag) // 创建 vnode 的根节点对应的 dom 节点
    createChildren(vnode, children) // 创建 vnode 的孩子对应的 dom 节点
    insert(parentElm, vnode.elm, refElm) // 将 vnode 对应的 dom 节点插入到 refElm 之前
  } else { // 文本节点
    vnode.elm = nodeOps.createTextNode(text)
    insert(parentElm, vnode.elm, refElm) // 将 vnode 对应的 dom 节点插入到 refElm 之前
  }
}

/**
 * 创建 vnode 的孩子对应的 dom 节点
 * @param {*} vnode 
 * @param {*} children 
 */
function createChildren (vnode, children) {
  if (Array.isArray(children)) {
    for (let i = 0;i < children.length;i++) {
      createElm(children[i], vnode.elm, null)
    }
  }
}

/**
 * 将 elm 插入到 ref 前面
 * 如果 ref 没有定义，则插入到 parent 内部末尾
 * @param {*} parent 
 * @param {*} elm 
 * @param {*} ref 
 */
function insert (parent, elm, ref) {
  if (isDef(parent)) {
    if (isDef(ref)) {
      nodeOps.insertBefore(parent, elm, ref)
    } else {
      nodeOps.appendChild(parent, elm)
    }
  }
}
```

代码本身读起来也并不困难，归纳起来有三步：
1. 如果是文本节点，直接跳到第四步；
2. 创建 vnode 的根节点对应的 dom 节点；
3. 创建 vnode 的孩子对应的 dom 节点；
4. 将 vnode 对应的 dom 节点插入到 refElm 之前；

前边我们构造的 ul 的 VNode 对象可以通过以下方式渲染到 id="container" 的节点里边。

```js
createElm(
    ul,   // VNode
    document.getElementById("container"), // parentElm
    null  // refElm
)
```

## 3. VNode 的更新如何作用到 DOM 树

这里我们将上一个状态的 VNode 对象命名为 oldVnode。

本次的状态 VNode 对象命名为 newVnode。

### 3.1 patch

我们定义一个 patch 函数，用于把 VNode 的更新作用到对应的 DOM 树。

```js
// VNode 的更新作用到对应的 DOM 树上
patch (oldVnode, newVnode)
```

![把 VNode 树的更新作用于 Dom 树上](http://ttc-tal.oss-cn-beijing.aliyuncs.com/1583661979/patchvnode.png)

接下来我们来阐述一下 VNode 各种状态的更新将如何更新对应 DOM 树

#### 3.1.1 oldVnode 和 newVnode 根节点一致

> 注意这里的根节点一致，指的是他们的标签名一致

![vnode 标签一致](http://ttc-tal.oss-cn-beijing.aliyuncs.com/1583662555/patchsameroot.png)

使用 updateChildren 继续递归对比他们孩子节点 (我们在后边再讨论 updateChildren )

```js
function patch (oldVnode, newVnode) {
  if (sameVnode(oldVnode, newVnode)) {
    // 如果两个 vnode 根节点一致
    updateChildren(oldVnode.children, newVnode.children)
  } else {
    // see 3.1.2
  }
}
```

#### 3.1.2 oldVnode 和 newVnode 根节点不一致

![vnode标签不一致](http://ttc-tal.oss-cn-beijing.aliyuncs.com/1583663169/patchnotsameroot.png)

1. 找到 oldVnode 对应的 DOM 节点及其父节点
2. 把当前的 vnode 渲染在原来的父节点下
3. 把旧的 DOM 节点从原来的 DOM 树上移除

```js
const patch = (oldVnode, newVnode) => {
  if (sameVnode(oldVnode, newVnode)) {
    // See 3.1.1
  } else {
    // 1. 找到 oldVnode 对应的 DOM 节点及其父节点
    const oldElm = oldVnode.elm
    const parentElm = document.parentNode(oldElm)

    // 2. 把当前的 vnode 渲染在原来的父亲节点下
    createElm(
      newVnode,
      parentElm,
      document.nextSibling(oldElm)
    )

    // 3. 把旧的 DOM 节点从原来的 DOM 树上移除
    removeNode(oldVnode.elm)
  }
}
```

### 3.2 如何比较孩子节点之间的差异-updateChildren

刚刚3.1.1节提到，当两个根节点标签一致的情况下，接下来就是对他们的孩子节点 oldCh 和 newCh 做对比

![updatechildren.png](http://ttc-tal.oss-cn-beijing.aliyuncs.com/1583663758/updatechildren.png)

为了简述方便，我们用字母 a, b, c 来表示 VNode 节点，我们用以下例子来阐述一下 
 updateChildren 的过程

定义四个指针 oldStartVnode、oldEndVnode、newStartVnode、newEndVnode

#### 3.2.1 oldStartVnode 和 newStartVnode 相同

递归 patch 2个节点，然后挪动2个指针位置

![updatechildren1.png](http://ttc-tal.oss-cn-beijing.aliyuncs.com/1583664655/updatechildren1.png)

```js
function updateChildren (parentElm, oldCh, newCh) {
  /* blabla */
  while (oldStartIdx <= oldEndIdx && newStartIdx <= newEndIdx) {
    if (/* blabla */) {
      /* blabla */
    } else if (sameVnode(oldStartVnode, newStartVnode)) {
      patchVnode(oldStartVnode, newStartVnode)
      oldStartVnode = oldCh[++oldStartIdx]
      newStartVnode = newCh[++newStartIdx]
    }
  }
}

```

#### 3.2.2 oldEndVnode 和 newEndVnode 相同

同3.2.1

![updatechildren2.png](http://ttc-tal.oss-cn-beijing.aliyuncs.com/1583665085/updatechildren2.png)

```js
function updateChildren (parentElm, oldCh, newCh) {
  /* blabla */
  while (oldStartIdx <= oldEndIdx && newStartIdx <= newEndIdx) {
    if (/* blabla */) {
      /* blabla */
    } else if (sameVnode(oldEndVnode, newEndVnode)) {
      patchVnode(oldEndVnode, newEndVnode)
      oldEndVnode = oldCh[--oldEndIdx]
      newEndVnode = newCh[--newEndIdx]
    }
  }
}
```

#### 3.2.3 oldStartVnode 和 newEndVnode 相同

递归 patch 两个节点，同时把 oldStartDom 挪到 oldEndDom 之后

![updatechildren3.png](http://ttc-tal.oss-cn-beijing.aliyuncs.com/1583665483/updatechildren3.png)

```js
function updateChildren (parentElm, oldCh, newCh) {
  /* blabla */
  while (oldStartIdx <= oldEndIdx && newStartIdx <= newEndIdx) {
    if (/* blabla */) {
      /* blabla */
    } else if (sameVnode(oldStartVnode, newEndVnode)) {
      patchVnode(oldStartVnode, newEndVnode)
      parentElm.insertBefore(oldStartVnode.elm, oldEndVnode.elm.nextSibling)
      oldStartVnode = oldCh[++oldStartIdx]
      newEndVnode = newCh[--newEndIdx]
    }
  }
}
```

#### 3.2.4 oldEndVnode 和 newStartVnode 相同

递归 patch 两个节点，同时把 oldEndDom 挪到 oldStartDom 之前

![updatechildren4.png](http://ttc-tal.oss-cn-beijing.aliyuncs.com/1583666133/updatechildren4.png)

```js
function updateChildren (parentElm, oldCh, newCh) {
  /* blabla */
  while (oldStartIdx <= oldEndIdx && newStartIdx <= newEndIdx) {
    if (/* blabla */) {
      /* blabla */
    } else if (sameVnode(oldEndVnode, newStartVnode)) {
      patchVnode(oldEndVnode, newStartVnode)
      parentElm.insertBefore(oldEndVnode.elm, oldStartVnode.elm)
      oldEndVnode = oldCh[--oldEndIdx]
      newStartVnode = newCh[++newStartIdx]
    }
  }
}
```

#### 3.2.5 其它情况

直接创建新的 dom，插入到原来的父节点底下

![updatechildren5.png](http://ttc-tal.oss-cn-beijing.aliyuncs.com/1583666334/updatechildren5.png)

```js
function updateChildren (parentElm, oldCh, newCh) {
  /* blabla */
  while (oldStartIdx <= oldEndIdx && newStartIdx <= newEndIdx) {
    if (/* blabla */) {
      /* blabla */
    } else {
      createElm(newStartVnode, parentElm, oldStartVnode.elm)
      newStartVnode = newCh[++newStartIdx]
    }
  }
}
```

当循环结束之后，需要把 oldCh 和 newCh 还未处理的元素分别 从 dom 树 remove 掉 或者 add 进 dom 树。

我们可以想一下大多数涉及到列表操作的业务场景都是从列表里边删除某一项，或者从列表里边插入某一项。所以上述的 updateChildren 的算法效率还是很高的，时间复杂度 O(n) 就可以做完整个 VNode 树的更新了。

## 4. 代码整理

当然前边的代码有一些边界问题没处理，[点此查看完整代码](https://github.com/liuyuanquan/vue2-learning-notes/tree/v1.1
)，代码里面的关键地方都写了注释，大家有兴趣的可以前往阅读。
