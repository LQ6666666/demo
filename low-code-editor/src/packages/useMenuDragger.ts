import { type EditorComponent } from "@/utils/editor-config";
import { type Ref, type WritableComputedRef } from "vue";
import { type EditorData } from "./editor-types";
import { events } from "./events";

export const useMenuDragger = (
  containerRef: Ref<HTMLElement | undefined>,
  data: WritableComputedRef<EditorData>
) => {
  // 当前正在拖拽的组件
  let currentDragComponent: EditorComponent | null = null;

  const dragenter = (e: DragEvent) => {
    if (e.dataTransfer) {
      // H5 拖动的图标
      e.dataTransfer.dropEffect = "move";
    }
  };

  const dragover = (e: DragEvent) => {
    e.preventDefault();
  };

  const dragleave = (e: DragEvent) => {
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = "none";
    }
  };

  const drop = (e: DragEvent) => {
    console.log(currentDragComponent);
    // 内部已经渲染的组件
    const blocks = data.value.blocks;
    const newData: EditorData = {
      ...data.value,
      blocks: [
        ...blocks,
        {
          top: e.offsetY,
          left: e.offsetX,
          zIndex: 1,
          key: currentDragComponent!.key,
          // 希望松手的时候 可以居中
          alignCenter: true,
          props: {},
          model: {}
        }
      ]
    };
    data.value = newData;
    currentDragComponent = null;
  };

  const dragstart = (e: DragEvent, component: EditorComponent) => {
    // dragenter 进入元素中，添加一个移动的标识
    // dragover 在目标元素经过，必须要阻止默认事件，否则不能触发 drop
    // dragleave 离开元素的时候，需要增加一个禁用标识
    // drop 松手的时候，根据拖拽的组件添加一个组件

    containerRef.value!.addEventListener("dragenter", dragenter);
    containerRef.value!.addEventListener("dragover", dragover);
    containerRef.value!.addEventListener("dragleave", dragleave);
    containerRef.value!.addEventListener("drop", drop);

    currentDragComponent = component;
    // 发布 start
    events.emit("start");
  };

  const dragend = () => {
    containerRef.value!.removeEventListener("dragenter", dragenter);
    containerRef.value!.removeEventListener("dragover", dragover);
    containerRef.value!.removeEventListener("dragleave", dragleave);
    containerRef.value!.removeEventListener("drop", drop);

    // 发布 end
    events.emit("end");
  };

  return { dragstart, dragend };
};
