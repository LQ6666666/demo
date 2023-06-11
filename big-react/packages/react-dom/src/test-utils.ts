import { ReactElementType } from "@react/shared";
// @ts-ignore
import { createRoot } from "react-dom";

export function renderIntoDocument(element: ReactElementType) {
  const div = document.createElement("div");
  return createRoot(div).render(element);
}
