export type WorkTag =
  | typeof FunctionComponent
  | typeof ClassComponent
  | typeof IndeterminateComponent
  | typeof HostRoot
  | typeof HostComponent
  | typeof HostText
  | typeof Fragment;

export const FunctionComponent = 0;

export const ClassComponent = 1;

export const IndeterminateComponent = 2;

export const HostRoot = 3;

export const HostComponent = 5;

export const HostText = 6;

export const Fragment = 7;
