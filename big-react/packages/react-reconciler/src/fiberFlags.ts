export type Flags = number;

export const NoFlags = 0b000000000000000000000000000;

// 插入: a => ab
// 移动: abc => bca
export const Placement = 0b000000000000000000000000010;

// 属性变化
// <img title="图片A" /> => <img title="图片B" />
export const Update = 0b000000000000000000000000100;

// ul li * 3 => ul li * 1
export const ChildDeletion = 0b000000000000000000000010000;

export const Ref = 0b000000000000000001000000000;

// subtreeFlags 中包含了 MutationMask 中指定的 flags 就表示需要执行这个阶段
export const MutationMask = Placement | Update | ChildDeletion | Ref;

export const LayoutMask = Ref;

/** 当前 fiber 存在本次更新存在副作用 */
export const Passive = 0b000000000000000100000000000;

/** 需要触发 useEffect 回调 */
export const PassiveMask = Passive | ChildDeletion;
