import { computed, defineComponent, type PropType, CSSProperties, inject, ref } from "vue";
import { cloneDeep } from "lodash-es";
import { type Block, type EditorData } from "./editor-types";

import EditorBlock from "./editor-block";

import "./editor.scss";
import { configKey } from "@/utils/injection-key";
import { type EditorComponent } from "@/utils/editor-config";
import { useMenuDragger } from "./useMenuDragger";
import { useFocus } from "./useFocus";
import { useBlockDragger } from "./useBlockDragger";
import { useCommand } from "./useCommand";

export default defineComponent({
  props: {
    modelValue: {
      type: Object as PropType<EditorData>,
      required: true
    }
  },
  emits: ["update:modelValue"],
  setup(props, { emit }) {
    const data = computed({
      get() {
        return props.modelValue;
      },
      set(val) {
        emit("update:modelValue", cloneDeep(val));
      }
    });

    const config = inject(configKey)!;

    const containerStyles = computed<CSSProperties>(() => ({
      width: props.modelValue.container.width + "px",
      height: props.modelValue.container.height + "px"
    }));

    const containerRef = ref<HTMLElement>();
    // 1.实现菜单的拖拽功能
    const { dragstart, dragend } = useMenuDragger(containerRef, data);

    // 2. 实现获取焦点,选中后可能就直接进行拖拽了
    const { blockMousedown, focusData, containerMousedown, lastSelectBlock } = useFocus(data, e => {
      mousedown(e);
    });

    // 3. 实现拖拽多个元素的功能
    const { mousedown, markLine } = useBlockDragger(focusData, lastSelectBlock, data);

    const { commands } = useCommand(data);

    const buttons = [
      {
        label: "撤销",
        handler: () => {
          commands.undo();
        }
      },
      {
        label: "重做",
        handler: () => {
          commands.redo();
        }
      }
    ];

    return () => (
      <div class="editor">
        <div class="editor-left">
          {/* 根据注册列表渲染对应的内容 */}
          {/* 可以显示 H5 的拖拽 */}
          {config.componentList.map(component => (
            <div
              class="editor-left-item"
              draggable
              onDragstart={e => dragstart(e, component)}
              onDragend={dragend}
            >
              <span>{component.label}</span>
              <div>{component.preview()}</div>
            </div>
          ))}
        </div>

        <div class="editor-top">
          {buttons.map((btn, index) => {
            return (
              <div class="editor-top-button" onClick={btn.handler}>
                {/* <i class="ny"></i> */}
                <span>{btn.label}</span>
              </div>
            );
          })}
        </div>
        <div class="editor-right">属性栏</div>
        <div class="editor-container">
          {/* 负责产生滚动条 */}
          <div class="editor-container-canvas">
            {/* 产生内容区域 */}
            <div
              ref={containerRef}
              style={containerStyles.value}
              class="editor-container-canvas__content"
              onMousedown={containerMousedown}
            >
              {data.value.blocks.map((block, index) => (
                <EditorBlock
                  block={block}
                  onMousedown={(e: MouseEvent) => blockMousedown(e, block, index)}
                />
              ))}

              {markLine.x !== null && (
                <div class="line-x" style={{ left: markLine.x + "px" }}></div>
              )}
              {markLine.y !== null && <div class="line-y" style={{ top: markLine.y + "px" }}></div>}
            </div>
          </div>
        </div>
      </div>
    );
  }
});
