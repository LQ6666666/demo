import { ElDialog, DialogProps, ElInput, ElButton } from "element-plus";
import { createVNode, defineComponent, PropType, reactive, render, VNode } from "vue";

type OptionProps = Partial<DialogProps> & { [key: string]: any };

const DialogComponent = defineComponent({
  props: {
    option: {
      type: Object as PropType<OptionProps>,
      required: true
    }
  },
  setup(props, { expose }) {
    const state = reactive({
      option: { ...props.option },
      visible: false
    });

    const cancel = () => {
      state.visible = false;
    };

    const confirm = () => {
      state.option.onConfirm?.(state.option.content);
      state.visible = false;
    };

    expose({
      open(option: OptionProps) {
        state.option = option;
        state.visible = true;
      }
    });

    return () => {
      return (
        <ElDialog v-model={state.visible} {...state.option}>
          {{
            default: () => <ElInput type="textarea" v-model={state.option.content} rows={10} />,
            footer: () =>
              state.option.footer && (
                <>
                  <ElButton onClick={cancel}>取消</ElButton>
                  <ElButton onClick={confirm}>确定</ElButton>
                </>
              )
          }}
        </ElDialog>
      );
    };
  }
});

let vm: VNode | null = null;
export function $dialog(option: OptionProps) {
  if (!vm) {
    const el = document.createElement("div");
    // 将组件渲染成真实节点，放到页面上
    vm = createVNode(DialogComponent, { option });
    // 将组件渲染到这个 el 上面
    render(vm, el);
    document.body.appendChild(el);
  }

  const { open } = vm.component?.exposed as any;
  open(option);
}
