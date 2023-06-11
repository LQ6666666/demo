// ReactElement
import {
  REACT_ELEMENT_TYPE,
  hasOwnProperty,
  isObject,
  REACT_FRAGMENT_TYPE as Fragment
} from "@react/shared";
import type { Key, ElementType, Ref, Props, ReactElementType } from "@react/shared";

export { Fragment };

const RESERVED_PROPS = {
  key: true,
  ref: true,
  __self: true,
  __source: true
};

const ReactElement = (type: ElementType, key: Key, ref: Ref, props: Props): ReactElementType => {
  const element = {
    $$typeof: REACT_ELEMENT_TYPE,
    type,
    key,
    ref,
    props,
    __mark: "lq"
  };
  return element;
};

export const jsx = (type: ElementType, config: any = {}, maybeKey?: string) => {
  let key: Key = null;
  const props: Props = {};
  let ref: Ref = null;

  if (maybeKey !== undefined) {
    key = "" + maybeKey;
  }

  if (hasValidKey(config)) {
    key = "" + config.key;
  }

  if (hasValidRef(config)) {
    ref = config.ref;
  }

  for (const propName in config) {
    // 不是原型上的属性 && 不是保留的属性
    if (hasOwnProperty.call(config, propName) && !hasOwnProperty.call(RESERVED_PROPS, propName)) {
      props[propName] = config[propName];
    }
  }

  return ReactElement(type, key, ref, props);
};

function hasValidKey(config: any) {
  return config.key !== undefined;
}

function hasValidRef(config: any) {
  return config.ref !== undefined;
}

export const jsxDEV = (type: ElementType, config: any, maybeKey?: string) => {
  let key: Key = null;
  const props: Props = {};
  let ref: Ref = null;

  if (maybeKey !== undefined) {
    key = "" + maybeKey;
  }

  if (hasValidKey(config)) {
    key = "" + config.key;
  }

  if (hasValidRef(config)) {
    ref = config.ref;
  }

  for (const propName in config) {
    // 不是原型上的属性 && 不是保留的属性
    if (hasOwnProperty.call(config, propName) && !hasOwnProperty.call(RESERVED_PROPS, propName)) {
      props[propName] = config[propName];
    }
  }

  return ReactElement(type, key, ref, props);
};

export function createElement(type: ElementType, config: any = {}, ...children: any) {
  let propName;

  // Reserved names are extracted
  const props: Props = {};

  let key: Key = null;
  let ref: Ref = null;

  if (config != null) {
    if (hasValidRef(config)) {
      ref = config.ref;
    }
    if (hasValidKey(config)) {
      key = `${config.key}`;
    }

    // Remaining properties are added to a new props object
    for (propName in config) {
      // 不是原型上的属性 && 不是保留的属性
      if (hasOwnProperty.call(config, propName) && !hasOwnProperty.call(RESERVED_PROPS, propName)) {
        props[propName] = config[propName];
      }
    }
  }

  const childrenLength = children.length;
  if (childrenLength === 1) {
    props.children = children[0];
  } else if (childrenLength > 1) {
    props.children = children;
  }

  return ReactElement(type, key, ref, props);
}

export function isValidElement(obj: any) {
  return isObject(obj) && (obj as ReactElementType).$$typeof === REACT_ELEMENT_TYPE;
}
