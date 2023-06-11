import {
  Props,
  REACT_ELEMENT_TYPE,
  ReactElementType,
  isObject,
  isArray,
  isString,
  isNumber,
  REACT_FRAGMENT_TYPE,
  Key
} from "@react/shared";
import {
  FiberNode,
  createFiberFromElement,
  createFiberFromText,
  createWorkInProgress,
  createFiberFromFragment
} from "./fiber";
import { HostText, Fragment } from "./workTags";
import { ChildDeletion, Placement } from "./fiberFlags";

type ExistingChildren = Map<string | number, FiberNode>;

/**
 * 对于同级多级`Diff`的支持
 * 1. 单节点需要支持的情况: 插入`Placement`、删除`ChildDeletion`
 * 2. 多节点需要支持的情况: 插入`Placement`、删除`ChildDeletion`、移动`Placement`
 * 整体流程分为`4`步
 * 1. 将`current`中的所有同级`fiber`保存在`Map`中
 * 2. 遍历`newChild`数组，对于每个遍历到的 element, 存在两种情况
 *  a. 在`Map`中存在对应的`current fiber`, 且可以复用
 *  b. 在`Map`中不存在对用的`current fiber`, 或不能复用
 * 3. 判断是插入还是移动
 * 4. 最后`Map`中剩下的都标记删除
 */
function createChildReconciler(shouldTrackSideEffects: boolean) {
  /**
   * 四种情况
   * 1. `key`相同, `type`相同 === 复用当前节点
   * 2. `key`相同, `type`不同 === 不存在任何复用的可能性(因为`key`是唯一的)
   * 3. `key`不同, `type`相同 === 当前节点不能复用
   * 4. `key`不同, `type`不同 === 当前节点不能复用
   */
  function reconcilerSingleElement(
    returnFiber: FiberNode,
    currentFirstChild: FiberNode | null,
    element: ReactElementType
  ) {
    const key = element.key;

    let child = currentFirstChild;
    while (child !== null) {
      // key 相同
      if (child.key === key) {
        if (element.$$typeof === REACT_ELEMENT_TYPE) {
          const elementType = element.type;

          if (elementType === REACT_FRAGMENT_TYPE) {
            if (child.tag === Fragment) {
              deleteRemainingChildren(returnFiber, child.sibling);
              const existing = useFiber(child, element.props.children);
              existing.return = returnFiber;
              return existing;
            }
          } else {
            if (elementType === child.type) {
              // key 相同 type 相同
              // 当前节点可以复用，剩下节点的需要删除
              deleteRemainingChildren(returnFiber, child.sibling);

              const existing = useFiber(child, element.props);
              existing.return = returnFiber;
              return existing;
            }

            // key 相同, type 不同, 删除所有旧的
            deleteRemainingChildren(returnFiber, child);
            break;
          }
        } else {
          if (__DEV__) {
            console.warn("未实现的 React 类型");
          }
          break;
        }
      } else {
        // key 不同, 删除旧的
        deleteChild(returnFiber, child);
      }

      child = child.sibling;
    }

    // 根据 element 创建 fiber
    if (element.type === REACT_FRAGMENT_TYPE) {
      const created = createFiberFromFragment(element.props.children, element.key);
      created.return = returnFiber;
      return created;
    } else {
      const fiber = createFiberFromElement(element);
      fiber.return = returnFiber;
      return fiber;
    }
  }

  function useFiber(fiber: FiberNode, pendingProps: Props) {
    const clone = createWorkInProgress(fiber, pendingProps);
    clone.index = 0;
    clone.sibling = null;
    return clone;
  }

  function deleteRemainingChildren(returnFiber: FiberNode, currentFirstChild: FiberNode | null) {
    if (!shouldTrackSideEffects) return null;

    let childToDelete = currentFirstChild;
    while (childToDelete !== null) {
      deleteChild(returnFiber, childToDelete);
      childToDelete = childToDelete.sibling;
    }

    return null;
  }

  function deleteChild(returnFiber: FiberNode, childToDelete: FiberNode) {
    if (!shouldTrackSideEffects) {
      return;
    }
    const deletions = returnFiber.deletions;
    if (deletions === null) {
      returnFiber.deletions = [childToDelete];
      returnFiber.flags |= ChildDeletion;
    } else {
      deletions.push(childToDelete);
    }
  }

  function reconcilerSingleTextNode(
    returnFiber: FiberNode,
    currentFirstChild: FiberNode | null,
    textContent: string
  ) {
    if (currentFirstChild !== null && currentFirstChild.tag === HostText) {
      deleteRemainingChildren(returnFiber, currentFirstChild.sibling);

      const existing = useFiber(currentFirstChild, { textContent });
      existing.return = returnFiber;
      return existing;
    }

    deleteRemainingChildren(returnFiber, currentFirstChild);

    const fiber = new FiberNode(HostText, { textContent }, null);
    fiber.return = returnFiber;
    return fiber;
  }

  function placeSingleChild(fiber: FiberNode) {
    // fiber.alternate 就是 currentFiber 对应首屏渲染的情况
    if (shouldTrackSideEffects && fiber.alternate === null) {
      fiber.flags |= Placement;
    }

    return fiber;
  }

  /**
   *
   * @param returnFiber 父 `fiber` 节点
   * @param currentFirstChild 这级 `fiber` 的第一个 `fiber`
   * @param newChildren `ReactElement` 数组
   */
  function reconcileChildrenArray(
    returnFiber: FiberNode,
    currentFirstChild: FiberNode | null,
    newChildren: any[]
  ) {
    // 第一个新的 fiber 节点, 用于返回
    let resultingFirstChild: FiberNode | null = null;
    // 上一个新的 fiber 节点, 用于连接上一个 fiber
    let previousNewFiber: FiberNode | null = null;
    // 当前正在 Diff 的 current fiber
    let oldFiber = currentFirstChild;
    // 最大的不需要移动的老节点的索引
    let lastPlacedIndex = 0;
    /** 当前遍历到 `ReactElement 数组` 的下标 */
    let newIdx = 0;
    // 下一个要 Diff 的 current fiber
    let nextOldFiber = null;

    // 第一轮遍历
    for (; oldFiber !== null && newIdx < newChildren.length; newIdx++) {
      // 当前的 oldFiber的位置 大于 新的ReactElement的位置
      if (oldFiber.index > newIdx) {
        nextOldFiber = oldFiber;
        // 跳出循环
        oldFiber = null;
      } else {
        nextOldFiber = oldFiber.sibling;
      }

      // 尝试复用 fiber, 两种情况
      // 返回 fiber: key 相同 type 不同 => 不可复用，否则复用
      // 返回 null: key 不同
      const newFiber = updateSlot(returnFiber, oldFiber, newChildren[newIdx]);
      // 不可复用
      if (newFiber === null) {
        // oldFiber 不存在
        if (oldFiber === null) {
          oldFiber = nextOldFiber;
        }
        break;
      }

      if (shouldTrackSideEffects) {
        // 更新流程
        // 没有复用 oldFiber, newFiber 是新建的
        // 将 oldFiber 删除
        if (oldFiber && newFiber.alternate === null) {
          deleteChild(returnFiber, oldFiber);
        }
      }

      lastPlacedIndex = placeChild(newFiber, lastPlacedIndex, newIdx);

      // 记录同级的第一个 fiber 用来, 返回给 beginWork
      if (previousNewFiber === null) {
        resultingFirstChild = newFiber;
      } else {
        // 连接上一个 fiber
        previousNewFiber.sibling = newFiber;
      }
      previousNewFiber = newFiber;
      oldFiber = nextOldFiber;
    }

    // 新的 jsx 都能复用 oldFiber
    // 可能 oldFiber 还有剩余: 删除多的老 fiber
    if (newIdx === newChildren.length) {
      deleteRemainingChildren(returnFiber, oldFiber);
      return resultingFirstChild;
    }

    // newChildren 还有，老的 fiber 没有了
    // 根据 jsx 对象 创建 fiber
    if (oldFiber === null) {
      // 剩下的都是新建 fiber 插入
      for (; newIdx < newChildren.length; newIdx++) {
        const newFiber = createChild(returnFiber, newChildren[newIdx]);
        if (newFiber === null) continue;

        lastPlacedIndex = placeChild(newFiber, lastPlacedIndex, newIdx);
        if (previousNewFiber === null) {
          resultingFirstChild = newFiber;
        } else {
          previousNewFiber.sibling = newFiber;
        }
        previousNewFiber = newFiber;
      }

      return resultingFirstChild;
    }

    // 这时候第一轮跳出的遍历, oldFiber 和 newChildren 都没遍历完
    // 将 oldFiber 及后面所有 sibling fiber 添加到 Map 中, 以便快速查找
    const existingChildren = mapRemainingChildren(returnFiber, oldFiber);

    for (; newIdx < newChildren.length; newIdx++) {
      // 从 map 中根据 key 找可以复用的 fiber，然后复用
      const newFiber = updateFromMap(existingChildren, returnFiber, newIdx, newChildren[newIdx]);

      if (newFiber !== null) {
        // 更新阶段
        if (shouldTrackSideEffects) {
          // newFiber.alternate !== null 就是复用了的老 fiber
          if (newFiber.alternate !== null) {
            // 在 map 中删除掉复用的老 fiber
            existingChildren.delete(newFiber.key === null ? newIdx : newFiber.key);
          }
        }

        // 更新最大的不需要移动的可以复用的老节点索引
        // 索引             0 1 2 3 4 5
        // 旧节点           A B C D E F
        // 新节点           A C E B D F
        // lastPlacedIndex 0 2 4 4 4 5

        // 更新过程
        // (oldIndex < lastPlacedIndex) 是否需要移动
        // C(2 < 0) 不需要移动 lastPlacedIndex = 2
        // E(4 < 2) 不需要移动 lastPlacedIndex = 4
        // B(1 < 4) 需要移动  lastPlacedIndex = 4
        // D(3 < 4) 需要移动 lastPlacedIndex = 4
        // F(5 < 4) 不需要移动 lastPlacedIndex = 5
        lastPlacedIndex = placeChild(newFiber, lastPlacedIndex, newIdx);

        // 建立连接
        if (previousNewFiber === null) {
          resultingFirstChild = newFiber;
        } else {
          previousNewFiber.sibling = newFiber;
        }
        previousNewFiber = newFiber;
      }
    }

    // 剩下都是不能复用的 老fiber (没有通过 key 找到的 oldFiber)
    // 删除即可
    if (shouldTrackSideEffects) {
      existingChildren.forEach(child => deleteChild(returnFiber, child));
    }

    return resultingFirstChild;
  }

  /** 根据 Map 尝试复用 */
  function updateFromMap(
    existingChildren: ExistingChildren,
    returnFiber: FiberNode,
    newIdx: number,
    newChild: any
  ) {
    // 文本节点
    if ((isString(newChild) && newChild !== "") || isNumber(newChild)) {
      const matchedFiber = existingChildren.get(newIdx) ?? null;
      return updateTextNode(returnFiber, matchedFiber, "" + newChild);
    }

    if (isObject(newChild)) {
      switch ((newChild as ReactElementType).$$typeof) {
        case REACT_ELEMENT_TYPE:
          // 根据 key 去找老 fiber
          const key = (newChild as ReactElementType).key ?? newIdx;
          const matchedFiber = existingChildren.get(key) ?? null;
          // 尝试复用老 fiber, 不能就 新建 fiber
          return updateElement(returnFiber, matchedFiber, newChild as ReactElementType);
      }

      if (isArray(newChild)) {
        const matchedFiber = existingChildren.get(newIdx) || null;
        return updateFragment(returnFiber, matchedFiber, newChild, null);
      }

      throwOnInvalidObjectType(returnFiber, newChild);
    }

    return null;
  }

  /** 更加 ReactElement 创建 fiber */
  function createChild(returnFiber: FiberNode, newChild: any) {
    // 文本节点
    if ((isString(newChild) && newChild !== "") || isNumber(newChild)) {
      const created = createFiberFromText(newChild + "");
      created.return = returnFiber;
      return created;
    }

    if (isObject(newChild)) {
      switch ((newChild as ReactElementType).$$typeof) {
        //
        case REACT_ELEMENT_TYPE:
          const created = createFiberFromElement(newChild as ReactElementType);
          created.return = returnFiber;
          return created;
      }

      if (isArray(newChild)) {
        const created = createFiberFromFragment(newChild, null);
        created.return = returnFiber;
        return created;
      }

      throwOnInvalidObjectType(returnFiber, newChild);
    }

    return null;
  }

  function placeChild(newFiber: FiberNode, lastPlacedIndex: number, newIndex: number): number {
    // fiber 节点在 DOM 节点同级中的索引位置
    newFiber.index = newIndex;
    // mount 阶段直接返回
    if (!shouldTrackSideEffects) {
      return lastPlacedIndex;
    }
    // current 存在就是复用了 oldFiber
    const current = newFiber.alternate;
    if (current !== null) {
      // oldFiber 在页面中的位置
      const oldIndex = current.index;
      // 如果老 fiber 它对应的真实 DOM 挂载的索引比 lastPlacedIndex 小
      // 如果 oldIndex 小于 lastPlacedIndex 添加移动标记
      if (oldIndex < lastPlacedIndex) {
        // 需要移动, 添加 flag
        newFiber.flags |= Placement;
        return lastPlacedIndex;
      } else {
        // 不需要移动
        // 把 fiber 它原来的挂载索引返回成为新的 lastPlacedIndex
        return oldIndex;
      }
    } else {
      // 新创建的 fiber, 添加插入标记
      newFiber.flags |= Placement;
      return lastPlacedIndex;
    }
  }

  /**
   * 尝试复用 `fiber` , 两种情况
   * 1. 返回 `fiber`: `key` 相同 `type` 不同 => 不可复用， 否则复用
   * 2. 返回 `null`: `key` 不同
   */
  function updateSlot(returnFiber: FiberNode, oldFiber: FiberNode | null, newChild: any) {
    const key = oldFiber?.key ?? null;

    // 文本节点
    if ((isString(newChild) && newChild !== "") || isNumber(newChild)) {
      if (key === null) return null;

      return updateTextNode(returnFiber, oldFiber, "" + newChild);
    }

    if (isObject(newChild)) {
      switch ((newChild as ReactElementType).$$typeof) {
        //
        case REACT_ELEMENT_TYPE:
          //  key 相同 type 不同, 不可复用，不会跳出循环
          if ((newChild as ReactElementType).key === key) {
            return updateElement(returnFiber, oldFiber, newChild as ReactElementType);
          } else {
            // key 不同返回 null, 返回 null 会跳出遍历, 第一轮遍历结束
            return null;
          }
      }

      if (isArray(newChild)) {
        if (key !== null) return null;

        return updateFragment(returnFiber, oldFiber, newChild, null);
      }

      throwOnInvalidObjectType(returnFiber, newChild);
    }

    return null;
  }

  function updateElement(
    returnFiber: FiberNode,
    current: FiberNode | null,
    element: ReactElementType
  ) {
    const elementType = element.type;
    if (elementType === REACT_FRAGMENT_TYPE) {
      return updateFragment(returnFiber, current, element.props.children, element.key);
    }

    if (current !== null) {
      // update
      // key 相同 type 也相同
      if (current.type === elementType) {
        const existing = useFiber(current, element.props);
        existing.return = returnFiber;
        return existing;
      }
    }

    const created = createFiberFromElement(element);
    created.return = returnFiber;
    return created;
  }

  function updateFragment(
    returnFiber: FiberNode,
    current: FiberNode | null,
    fragment: any[],
    key: Key
  ) {
    // 不能复用
    if (current === null || current.tag !== Fragment) {
      const created = createFiberFromFragment(fragment, key);
      created.return = returnFiber;
      return created;
    } else {
      const existing = useFiber(current, fragment);
      existing.return = returnFiber;
      return existing;
    }
  }

  function updateTextNode(returnFiber: FiberNode, current: FiberNode | null, textContent: string) {
    if (current === null || current.tag !== HostText) {
      // 不能复用
      const created = createFiberFromText(textContent);
      created.return = returnFiber;
      return created;
    } else {
      const existing = useFiber(current, textContent as any);
      existing.return = returnFiber;
      return existing;
    }
  }

  function mapRemainingChildren(
    // @ts-ignore
    returnFiber: FiberNode,
    currentFirstChild: FiberNode
  ) {
    const existingChildren: ExistingChildren = new Map();
    let existingChild: null | FiberNode = currentFirstChild;
    while (existingChild !== null) {
      // 是否有 key
      if (existingChild.key !== null) {
        existingChildren.set(existingChild.key, existingChild);
      }
      // 没有就用 index
      else {
        existingChildren.set(existingChild.index, existingChild);
      }
      existingChild = existingChild.sibling;
    }
    return existingChildren;
  }

  function reconcileChildFibers(
    returnFiber: FiberNode,
    currentFirstChild: FiberNode | null,
    newChild?: ReactElementType
  ) {
    // 没有 key 的顶层 fragment
    const isUnkeyedTopLevelFragment =
      isObject(newChild) && newChild.type === REACT_FRAGMENT_TYPE && newChild.key === null;

    // <><div></div><div></div><div></div></> 的这种情况
    if (isUnkeyedTopLevelFragment) {
      newChild = newChild!.props.children;
    }

    // 判断当前 fiber 的类型
    if (isObject(newChild)) {
      switch (newChild.$$typeof) {
        case REACT_ELEMENT_TYPE:
          return placeSingleChild(
            reconcilerSingleElement(returnFiber, currentFirstChild, newChild)
          );
      }

      // 多节点的情况 ul => li * 3
      if (isArray(newChild)) {
        return reconcileChildrenArray(returnFiber, currentFirstChild, newChild);
      }

      throwOnInvalidObjectType(returnFiber, newChild);
    }

    // HostText
    if (typeof newChild === "string" || typeof newChild === "number") {
      return placeSingleChild(
        reconcilerSingleTextNode(returnFiber, currentFirstChild, "" + newChild)
      );
    }

    // 兜底删除
    if (newChild && __DEV__) {
      console.warn("未实现的 reconcile 类型", newChild);
    }
    return deleteRemainingChildren(returnFiber, currentFirstChild);
  }

  return reconcileChildFibers;
}

export const mountChildFibers = createChildReconciler(false);
export const reconcileChildFibers = createChildReconciler(true);

function throwOnInvalidObjectType(
  // @ts-ignore
  returnFiber: FiberNode,
  newChild: object
) {
  const childString = Object.prototype.toString.call(newChild);

  throw new Error(
    `Objects are not valid as a React child (found: ${
      childString === "[object Object]"
        ? "object with keys {" + Object.keys(newChild).join(", ") + "}"
        : childString
    }). ` +
      "If you meant to render a collection of children, use an array " +
      "instead."
  );
}
