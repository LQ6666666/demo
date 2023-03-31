import { ElButton, ElDialog, ElInput, ElTable, ElTableColumn } from "element-plus";
import { cloneDeep } from "lodash-es";
import { createVNode, defineComponent, PropType, reactive, render, VNode } from "vue";

const TableComponent = defineComponent({
  props: {
    option: {
      type: Object as PropType<any>
    }
  },
  setup(props, { expose }) {
    const state = reactive({
      option: props.option,
      visible: false,
      // 编辑的数据
      editData: [] as any[]
    });

    const methods = {
      open(option: any) {
        state.option = option;
        state.visible = true;
        state.editData = cloneDeep(option.data);
      }
    };

    const add = () => {
      state.editData.push({});
    };

    const onCancel = () => {
      state.visible = false;
    };

    const onConfirm = () => {
      state.option.onConfirm?.(state.editData);
      state.visible = false;
    };

    expose(methods);

    return () => (
      <ElDialog v-model={state.visible} title={state.option.config.label}>
        {{
          default: () => {
            return (
              <>
                <div>
                  <ElButton type="primary" onClick={add}>
                    添加
                  </ElButton>
                  <ElButton>重置</ElButton>
                </div>

                <ElTable data={state.editData}>
                  <ElTableColumn type="index" label="序号" width={70} />

                  {state.option.config.table.options.map((item: any) => {
                    return (
                      <ElTableColumn type="index" label={item.label} width={200}>
                        {{
                          default: ({ row }: any) => <ElInput v-model={row[item.field]} />
                        }}
                      </ElTableColumn>
                    );
                  })}

                  <ElTableColumn type="index" label="操作" width={100}>
                    <ElButton type="danger">删除</ElButton>
                  </ElTableColumn>
                </ElTable>
              </>
            );
          },
          footer: () => {
            return (
              <div>
                <ElButton onClick={onCancel}>取消</ElButton>
                <ElButton type="primary" onClick={onConfirm}>
                  确定
                </ElButton>
              </div>
            );
          }
        }}
      </ElDialog>
    );
  }
});

let vm: VNode | null = null;
export function $tableDialog(option: any) {
  if (!vm) {
    const el = document.createElement("div");
    // 将组件渲染成真实节点，放到页面上
    vm = createVNode(TableComponent, { option });
    // 将组件渲染到这个 el 上面
    render(vm, el);
    document.body.appendChild(el);
  }

  const { open } = vm.component?.exposed as any;
  open(option);
}
