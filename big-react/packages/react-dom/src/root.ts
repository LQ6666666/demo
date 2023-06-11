// ReactDOM.createRoot(root).render(<App />);

import { createContainer, updateContainer } from "@react/react-reconciler";
import { Container } from "hostConfig";
import { ReactElementType } from "@react/shared";
import { initEvent } from "./SyntheticEvent";

export function createRoot(container: Container) {
  const root = createContainer(container);

  return {
    render(element: ReactElementType) {
      initEvent(container, "click");
      return updateContainer(element, root);
    }
  };
}
