export interface EditorData {
  container: Container;
  blocks: Block[];
}

export interface Block {
  // 需要存储的属性
  top: number;
  left: number;
  zIndex: number;
  key: string;

  // 编辑器状态属性
  alignCenter?: boolean;
  focus?: boolean;
  width?: number;
  height?: number;
  props: Record<string, any>;
  model: Record<string, any>;

  [key: string]: any;
}

export interface Container {
  width: number;
  height: number;
}
