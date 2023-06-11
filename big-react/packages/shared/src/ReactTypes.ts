export type Key = string | null;
export type Ref = { current: any } | ((instance: any) => void) | null;
export type Props = {
  [key: string]: any;
  children?: any;
};

export type ElementType = any;

export interface ReactElementType {
  $$typeof: symbol;
  type: ElementType;
  key: Key;
  ref: Ref;
  props: Props;
}

export type Action<State> = State | ((prevState: State) => State);
