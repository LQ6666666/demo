export interface EditorData {
  container: Container;
  blocks: Block[];
}

export interface Block {
  top: number;
  left: number;
  zIndex: number;
  key: string;
  alignCenter?: boolean;
}

export interface Container {
  width: number;
  height: number;
}
