// ReactDOM.createRoot(root).render(<App />);

import { createContainer, updateContainer } from "@react/react-reconciler";
import { Container, Instance } from "./hostConfig";
import {
  REACT_ELEMENT_TYPE,
  REACT_FRAGMENT_TYPE,
  ReactElementType,
  isArray,
  isNumber,
  isString
} from "@react/shared";
import Scheduler from "scheduler";

let idCounter = 0;

export function createRoot() {
  const container: Container = {
    rootId: idCounter++,
    children: []
  };

  // @ts-ignore
  const root = createContainer(container);

  function getChildren(parent: Container | Instance) {
    if (parent) {
      return parent.children;
    }
    return null;
  }

  function getChildrenAsJSX(root: Container) {
    const children = childToJSX(getChildren(root));
    if (isArray(children)) {
      return {
        $$typeof: REACT_ELEMENT_TYPE,
        type: REACT_FRAGMENT_TYPE,
        key: null,
        ref: null,
        props: { children },
        __mark: "lq"
      };
    }
    return children;
  }

  function childToJSX(child: any): any {
    if (isString(child) || isNumber(child)) {
      return child;
    }

    if (isArray(child)) {
      if (child.length === 0) {
        return null;
      }

      if (child.length === 1) {
        return childToJSX(child[0]);
      }

      const children = child.map(childToJSX);
      if (children.every(child => isString(child) || isNumber(child))) {
        return children.join("");
      }

      return children;
    }

    // Instance
    if (isArray(child.children)) {
      const instance: Instance = child;
      const children = childToJSX(instance.children);
      const props = instance.props;

      if (children !== null) {
        props.children = children;
      }

      return {
        $$typeof: REACT_ELEMENT_TYPE,
        type: instance.type,
        key: null,
        ref: null,
        props,
        __mark: "lq"
      };
    }

    // TextInstance
    return child.text;
  }

  return {
    _Scheduler: Scheduler,
    render(element: ReactElementType) {
      return updateContainer(element, root);
    },
    getChildren() {
      return getChildren(container);
    },
    getChildrenAsJSX() {
      return getChildrenAsJSX(container);
    }
  };
}
