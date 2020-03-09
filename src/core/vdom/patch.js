import * as nodeOps from './node-ops'

/**
 * s 没有定义，为 undefined 或者 null
 * @param {*} s 
 */
function isUndef (s) {
  return s == null
}

/**
 * s 有定义，不为 undefined 或 null
 * @param {*} s 
 */
function isDef (s) {
  return s != null
}

/**
 * 判断 vnode1 和 vnode2 是否相同
 * 这里只比较二者的 tag 是否相同
 * @param {*} vnode1 
 * @param {*} vnode2 
 */
function sameVnode (vnode1, vnode2) {
  return vnode1.tag === vnode2.tag
}

/**
 * 删除节点
 * @param {*} el 
 */
function removeNode (el) {
  const parent = nodeOps.parentNode(el)
  isDef(parent) && nodeOps.removeChild(parent, el)
}

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

/**
 * 针对 vnodes 在 [startIdx, endIdx] 范围内批量执行 createElm
 * @param {*} parentElm 
 * @param {*} refElm 
 * @param {*} vnodes 
 * @param {*} startIdx 
 * @param {*} endIdx 
 */
function addVnodes (parentElm, refElm, vnodes, startIdx, endIdx) {
  while (startIdx <= endIdx) {
    createElm(vnodes[startIdx], parentElm, refElm)
    startIdx++
  }
}

/**
 * 针对 vnodes 在 [startIdx, endIdx] 范围内批量执行 removeNode
 * @param {*} parentElm 
 * @param {*} vnodes 
 * @param {*} startIdx 
 * @param {*} endIdx 
 */
function removeVnodes (parentElm, vnodes, startIdx, endIdx) {
  while (startIdx <= endIdx) {
    const vnode = vnodes[startIdx]
    isDef(vnode) && removeNode(vnode.elm)
    startIdx++
  }
}

/**
 * 对比 oldVnode 的 children 和 vnode 的 children
 * @param {*} parentElm 
 * @param {*} oldCh 
 * @param {*} newCh 
 */
const updateChildren = (parentElm, oldCh, newCh, removeOnly) => {
  let oldStartIdx = 0
  let oldStartVnode = oldCh[oldStartIdx]
  let oldEndIdx = oldCh.length - 1
  let oldEndVnode = oldCh[oldEndIdx]
  
  let newStartIdx = 0
  let newStartVnode = newCh[newStartIdx]
  let newEndIdx = newCh.length - 1
  let newEndVnode = newCh[newEndIdx]

  let oldKeyToIdx, idxInOld, elmToMove, refElm

  const canMove = !removeOnly

  while (oldStartIdx <= oldEndIdx && newStartIdx <= newEndIdx) {
    if (isUndef(oldStartVnode)) { // oldStartVnode 没有定义
      oldStartVnode = oldCh[++oldStartIdx] // ++oldStartIdx
    } else if (isUndef(oldEndVnode)) { // oldEndVnode 没有定义
      oldEndVnode = oldCh[--oldEndIdx] // --oldEndIdx
    } else if (sameVnode(oldStartVnode, newStartVnode)) { // oldStartVnode 与 newStartVnode 的 tag 一致
      patchVnode(oldStartVnode, newStartVnode) // 执行 patchVnode
      oldStartVnode = oldCh[++oldStartIdx] // ++oldStartIdx
      newStartVnode = newCh[++newStartIdx] // ++newStartIdx
    } else if (sameVnode(oldEndVnode, newEndVnode)) { // oldEndVnode 与 newEndVnode 的 tag 一致
      patchVnode(oldEndVnode, newEndVnode) // 执行 patchVnode
      oldEndVnode = oldCh[--oldEndIdx] // --oldEndIdx
      newEndVnode = newCh[--newEndIdx] // --newEndIdx
    } else if (sameVnode(oldStartVnode, newEndVnode)) { // oldStartVnode 与 newEndVnode 的 tag 一致
      patchVnode(oldStartVnode, newEndVnode) // 执行 patchVnode
      canMove && nodeOps.insertBefore(parentElm, oldStartVnode.elm, nodeOps.nextSibling(oldEndVnode.elm)) // 将 oldStartVnode 对应的 dom 节点插入到 oldEndVnode 对应的 dom 节点后面
      oldStartVnode = oldCh[++oldStartIdx] // ++oldStartIdx
      newEndVnode = newCh[--newEndIdx] // --newEndIdx
    } else if (sameVnode(oldEndVnode, newStartVnode)) { // oldEndVnode 与 newStartVnode 的 tag 一致
      patchVnode(oldEndVnode, newStartVnode) // 执行 patchVnode
      canMove && nodeOps.insertBefore(parentElm, oldEndVnode.elm, oldStartVnode.elm) // 将 oldEndVnode 对应的 dom 节点插入到 oldStartVnode对应的 dom 节点前面
      oldEndVnode = oldCh[--oldEndIdx] // --oldEndIdx
      newStartVnode = newCh[++newStartIdx] // ++newStartIdx
    } else { // 其它情况，都不相同
      createElm(newStartVnode, parentElm, oldStartVnode.elm) // 将 newStartVnode 对应的 dom 节点插入到 oldStartVnode 的前面
      newStartVnode = newCh[++newStartIdx] // ++newStartIdx
    }
  }
  if (oldStartIdx > oldEndIdx) { // oldCh 已遍历完， newCh 还有节点，添加 newCh 剩余的节点
    refElm = isUndef(newCh[newEndIdx + 1]) ? null : newCh[newEndIdx + 1].elm
    addVnodes(parentElm, refElm, newCh, newStartIdx, newEndIdx)
  } else if (newStartIdx > newEndIdx) { // newCh 已遍历完，oldCh 还有节点，删除 oldCh 剩余的节点
    removeVnodes(parentElm, oldCh, oldStartIdx, oldEndIdx)
  }
}

/**
 * 比较 oldVnode 和 vnode 的 children 和 text
 * @param {*} oldVnode 
 * @param {*} vnode 
 * @param {*} removeOnly 
 */
function patchVnode (oldVnode, vnode, removeOnly) {
  // 如果 oldVnode 和 vnode 相等
  if (oldVnode === vnode) return

  // 将 vnode 对应的 dom 节点 设置为 oldVnode 的 dom 节点
  const elm = vnode.elm = oldVnode.elm
  const oldCh = oldVnode.children
  const ch = vnode.children

  if (isDef(vnode.text)) { // vnode 是文本节点
    if (oldVnode.text !== vnode.text) { // // vnode 的 text 与 oldVnode 的 text 是否一致
      nodeOps.setTextContent(elm, vnode.text)
    }
  } else { // vnode 不是文本节点
    if (isDef(oldCh) && isDef(ch)) { // oldVnode 与 vnode 都有 children
      if (oldCh !== ch) updateChildren(elm, oldCh, ch, removeOnly) // 比较 oldVnode 和 vnode 的 children
    } else if (isDef(ch)) { // oldCh 没有 children，vnode 有 children 
      if (isDef(oldVnode.text)) nodeOps.setTextContent(elm, '')
      // 批量添加 vnode 的 children
      addVnodes(elm, null, ch, 0, ch.length - 1)
    } else if (isDef(oldCh)) { // oldCh 有 children，vnode 没有 children
      // 批量删除 oldVnode 的 children
      removeVnodes(elm, oldCh, 0, oldCh.length - 1)
    } else if (isDef(oldVnode.text)) { // oldVnode 有 text 
      nodeOps.setTextContent(elm, '')
    }
  }
}

/**
 * 比较 oldVnode 和 vnode 的差异并更新
 * @param {*} oldVnode 
 * @param {*} vnode 
 */
export default function patch (oldVnode, vnode) {
  if (sameVnode(oldVnode, vnode)) { // oldVnode 与 vnode 根节点的 tag 一致
    patchVnode(oldVnode, vnode)
  } else { // oldVnode 与 vnode 根节点的 tag 不一致
    // 不需要在比较各自的 children
    const oldElm = oldVnode.elm
    const parentElm = nodeOps.parentNode(oldElm)
    // 将 vnode 对应的 dom 节点插入到 parentElm 内部
    createElm(vnode, parentElm, nodeOps.nextSibling(oldElm))
    // 移除 oldVnode 对应的 dom 节点
    isDef(parentElm) && removeVnodes(parentElm, [oldVnode], 0, 0)
  }
}