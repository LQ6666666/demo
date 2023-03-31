import { configKey } from "@/utils/injection-key";
import {
  ElButton,
  ElColorPicker,
  ElForm,
  ElFormItem,
  ElInput,
  ElInputNumber,
  ElSelect,
  ElOption
} from "element-plus";
import { cloneDeep } from "lodash-es";
import { defineComponent, inject, PropType, reactive, VNode, watch } from "vue";
import { Block, EditorData } from "./editor-types";
import TableEditor from "./table-editor";

export default defineComponent({
  props: {
    block: {
      type: Object as PropType<Block>
    },
    data: {
      type: Object as PropType<EditorData>,
      required: true
    },
    updateContainer: {
      type: Function,
      required: true
    },
    updateBlock: {
      type: Function,
      required: true
    }
  },
  setup(props, {}) {
    // 组件的配置信息
    const config = inject(configKey)!;

    const state = reactive<any>({
      editData: {}
    });

    const reset = () => {
      // 说明要绑定的时容器的宽度和高度
      if (props.block) {
        state.editData = cloneDeep(props.block);
      } else {
        state.editData = cloneDeep(props.data.container);
      }
    };

    const apply = () => {
      if (props.block) {
        props.updateBlock(state.editData, props.block);
      } else {
        props.updateContainer({ ...props.data, container: state.editData });
      }
    };

    watch(() => props.block, reset, { immediate: true });

    return () => {
      const content: (VNode | VNode[])[] = [];
      if (props.block) {
        const component = config.componentMap[props.block.key];
        if (component && component.props) {
          content.push(
            Object.entries(component.props).map(([propName, propConfig]: [string, any]) => {
              return (
                <ElFormItem label={propConfig.label}>
                  {(
                    {
                      input: () => <ElInput v-model={state.editData.props[propName]} />,
                      color: () => <ElColorPicker v-model={state.editData.props[propName]} />,
                      select: () => (
                        <ElSelect v-model={state.editData.props[propName]}>
                          {propConfig.options.map((option: any) => (
                            <ElOption label={option.label} value={option.value} />
                          ))}
                        </ElSelect>
                      ),
                      table: () => (
                        <TableEditor
                          v-model={state.editData.props[propName]}
                          propsConfig={propConfig}
                        />
                      )
                    } as any
                  )[propConfig.type]?.()}
                </ElFormItem>
              );
            })
          );
        }

        if (component && component.model) {
          content.push(
            Object.entries(component.model).map(([modelName, label]: [string, any]) => {
              return (
                <ElFormItem label={label}>
                  <ElInput v-model={state.editData.model[modelName]} />
                </ElFormItem>
              );
            })
          );
        }
      } else {
        content.push(
          <>
            <ElFormItem label="容器宽度">
              <ElInputNumber v-model={state.editData.width} />
            </ElFormItem>

            <ElFormItem label="容器高度">
              <ElInputNumber v-model={state.editData.height} />
            </ElFormItem>
          </>
        );
      }

      return (
        <ElForm labelPosition="top" style="padding: 30px">
          {content}
          <ElFormItem>
            <ElButton type="primary" onClick={apply}>
              应用
            </ElButton>
            <ElButton onClick={reset}>重置</ElButton>
          </ElFormItem>
        </ElForm>
      );
    };
  }
});
