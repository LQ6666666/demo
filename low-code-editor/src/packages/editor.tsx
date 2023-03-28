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
import { $dialog } from "@/components/Dialog";
import { ElButton } from "element-plus";
import { $dropdown, DropdownItem } from "@/components/Dropdown";

export default defineComponent({
  props: {
    modelValue: {
      type: Object as PropType<EditorData>,
      required: true
    }
  },
  emits: ["update:modelValue"],
  setup(props, { emit }) {
    // 预览的时候 内容不能在操作了，可以点击 或者输入内容
    const previewRef = ref(false);
    const editorRef = ref(true);

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
    const { blockMousedown, focusData, containerMousedown, lastSelectBlock, clearBlockFocus } =
      useFocus(data, previewRef, e => {
        mousedown(e);
      });

    // 3. 实现拖拽多个元素的功能
    const { mousedown, markLine } = useBlockDragger(focusData, lastSelectBlock, data);

    const { commands } = useCommand(data, focusData);

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
      },
      {
        label: "导出",
        handler: () => {
          $dialog({
            title: "导出 JSON 使用",
            content: JSON.stringify(data.value)
          });
        }
      },
      {
        label: "导入",
        handler: () => {
          $dialog({
            title: "导入 JSON 使用",
            content: "",
            footer: true,
            onConfirm(text: string) {
              try {
                // 这样无法保留历史记录
                commands["updateContainer"](JSON.parse(text));
              } catch (error) {
                console.error(error);
              }
            }
          });
        }
      },
      {
        label: "置顶",
        handler: () => commands["placeTop"]()
      },
      {
        label: "置底",
        handler: () => commands["placeBottom"]()
      },
      {
        label: "删除",
        handler: () => commands["delete"]()
      },
      {
        label: () => (previewRef.value ? "编辑" : "预览"),
        handler: () => {
          previewRef.value = !previewRef.value;
          clearBlockFocus();
        }
      },
      {
        label: "关闭",
        handler: () => {
          editorRef.value = false;
        }
      }
    ];

    const onContextmenuBlock = (e: MouseEvent, block: Block) => {
      e.preventDefault();

      $dropdown({
        el: e.target as Element,
        content: () => (
          <>
            <DropdownItem onClick={() => commands["delete"]()} label="删除" />
            <DropdownItem onClick={() => commands["placeTop"]()} label="置顶" />
            <DropdownItem onClick={() => commands["placeBottom"]()} label="置底" />
            <DropdownItem
              onClick={() => {
                $dialog({
                  title: "查看节点数据",
                  content: JSON.stringify(block)
                });
              }}
              label="查看"
            />
            <DropdownItem
              onClick={() => {
                $dialog({
                  title: "导入节点数据",
                  content: "",
                  footer: true,
                  onConfirm(text: string) {
                    commands["updateBlock"](JSON.parse(text), block);
                  }
                });
              }}
              label="导入"
            />
          </>
        )
      });
    };

    return () =>
      editorRef.value ? (
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
                  <span>{typeof btn.label === "function" ? btn.label() : btn.label}</span>
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
                    preview={previewRef.value}
                    onMousedown={(e: MouseEvent) => blockMousedown(e, block, index)}
                    onContextmenu={(e: MouseEvent) => onContextmenuBlock(e, block)}
                  />
                ))}

                {markLine.x !== null && (
                  <div class="line-x" style={{ left: markLine.x + "px" }}></div>
                )}
                {markLine.y !== null && (
                  <div class="line-y" style={{ top: markLine.y + "px" }}></div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div
            ref={containerRef}
            style={{ ...containerStyles.value, margin: 0 }}
            class="editor-container-canvas__content"
          >
            {data.value.blocks.map(block => (
              <EditorBlock block={block} preview={previewRef.value} />
            ))}
          </div>
          <ElButton
            type="primary"
            onClick={() => {
              editorRef.value = true;
            }}
          >
            编辑
          </ElButton>
        </>
      );
  }
});
