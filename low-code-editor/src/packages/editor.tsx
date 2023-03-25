import { computed, defineComponent, type PropType, CSSProperties, inject, ref } from "vue";
import { cloneDeep } from "lodash-es";
import { type EditorData } from "./editor-types";

import EditorBlock from "./editor-block";

import "./editor.scss";
import { configKey } from "@/utils/injection-key";
import { type EditorComponent } from "@/utils/editor-config";
import { useMenuDragger } from "./useMenuDragger";

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
    // 实现菜单的拖拽功能
    const { dragstart, dragend } = useMenuDragger(containerRef, data);


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

        <div class="editor-top">菜单栏</div>
        <div class="editor-right">属性栏</div>
        <div class="editor-container">
          {/* 负责产生滚动条 */}
          <div class="editor-container-canvas">
            {/* 产生内容区域 */}
            <div
              ref={containerRef}
              style={containerStyles.value}
              class="editor-container-canvas__content"
            >
              {data.value.blocks.map(block => (
                <EditorBlock block={block} />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }
});
