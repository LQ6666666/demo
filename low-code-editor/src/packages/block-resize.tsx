import { EditorComponent } from "@/utils/editor-config";
import { defineComponent, PropType } from "vue";
import { Block } from "./editor-types";

import "./block-resize.scss";

type Direction = {
  horizontal: "start" | "end" | "center";
  vertical: "start" | "end" | "center";
};

export default defineComponent({
  props: {
    block: {
      type: Object as PropType<Block>
    },
    component: {
      type: Object as PropType<EditorComponent>,
      required: true
    }
  },
  setup(props) {
    const { width, height } = props.component.resize;

    let data: any = {};

    const mousemove = (e: MouseEvent) => {
      let { clientX, clientY } = e;
      let { startX, startY, startWidth, startHeight, startLeft, startTop, direction } = data;

      // 中间 X 不变
      if ((direction as Direction).horizontal === "center") {
        clientX = startX;
      }

      // 中间 Y 不变
      if ((direction as Direction).vertical === "center") {
        clientY = startY;
      }

      let duX = clientX - startX;
      let duY = clientY - startY;

      // 针对反向拖拽的点，需要取反
      if ((direction as Direction).vertical === "start") {
        duY = -duY;
        props.block!.top = startTop - duY;
      }

      if ((direction as Direction).horizontal === "start") {
        duX = -duX;
        props.block!.left = startLeft - duX;
      }

      const width = startWidth + duX;
      const height = startHeight + duY;

      if (props.block) {
        props.block.width = width;
        props.block.height = height;
        props.block.hasResize = height;
      }
    };

    const mouseup = () => {
      document.body.removeEventListener("mousemove", mousemove);
      document.body.removeEventListener("mouseup", mouseup);
    };

    const onMousedown = (e: MouseEvent, direction: Direction) => {
      e.stopPropagation();

      data = {
        startX: e.clientX,
        startY: e.clientY,
        startWidth: props.block?.width,
        startHeight: props.block?.height,
        startLeft: props.block?.left,
        startTop: props.block?.top,
        direction
      };

      document.body.addEventListener("mousemove", mousemove);
      document.body.addEventListener("mouseup", mouseup);
    };

    return () => (
      <>
        {width && (
          <>
            <div
              class="block-resize block-resize-left"
              onMousedown={e => onMousedown(e, { horizontal: "start", vertical: "center" })}
            ></div>
            <div
              class="block-resize block-resize-right"
              onMousedown={e => onMousedown(e, { horizontal: "end", vertical: "center" })}
            ></div>
          </>
        )}

        {height && (
          <>
            <div
              class="block-resize block-resize-top"
              onMousedown={e => onMousedown(e, { horizontal: "center", vertical: "start" })}
            ></div>
            <div
              class="block-resize block-resize-bottom"
              onMousedown={e => onMousedown(e, { horizontal: "center", vertical: "end" })}
            ></div>
          </>
        )}

        {width && height && (
          <>
            <div
              class="block-resize block-resize-top-left"
              onMousedown={e => onMousedown(e, { horizontal: "start", vertical: "start" })}
            ></div>
            <div
              class="block-resize block-resize-top-right"
              onMousedown={e => onMousedown(e, { horizontal: "end", vertical: "start" })}
            ></div>
            <div
              class="block-resize block-resize-bottom-left"
              onMousedown={e => onMousedown(e, { horizontal: "start", vertical: "end" })}
            ></div>
            <div
              class="block-resize block-resize-bottom-right"
              onMousedown={e => onMousedown(e, { horizontal: "end", vertical: "end" })}
            ></div>
          </>
        )}
      </>
    );
  }
});
