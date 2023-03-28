import { ElInput, ElButton } from "element-plus";
import {
  provide,
  inject,
  computed,
  createVNode,
  defineComponent,
  onBeforeMount,
  onMounted,
  PropType,
  reactive,
  ref,
  render,
  VNode,
  type CSSProperties
} from "vue";

import "./dropdown.scss";

interface OptionProps {
  el: Element;
  content: () => VNode | string | null | undefined;
  [key: string]: any;
}

export const DropdownItem = defineComponent({
  props: {
    label: {
      type: String,
      required: true
    }
  },
  setup(props, { attrs }) {
    const hide = inject<() => void>("hide");

    return () => (
      <div
        class="dropdown-item"
        onClick={e => {
          hide?.();
          (attrs as any).onClick?.(e);
        }}
      >
        <span>{props.label}</span>
      </div>
    );
  }
});

const DropdownComponent = defineComponent({
  props: {
    option: {
      type: Object as PropType<OptionProps>,
      required: true
    }
  },
  setup(props, { expose }) {
    const state = reactive({
      option: { ...props.option },
      visible: false,
      top: 0,
      left: 0
    });

    const className = computed(() => [
      "dropdown",
      {
        "dropdown-is-show": state.visible
      }
    ]);

    const styles = computed<CSSProperties>(() => ({
      top: state.top + "px",
      left: state.left + "px"
    }));

    expose({
      open(option: OptionProps) {
        state.option = option;
        state.visible = true;
        const { top, left, height } = option.el.getBoundingClientRect();
        state.top = top + height;
        state.left = left;
      }
    });

    const elRef = ref<HTMLElement>();
    const mousedown = (e: MouseEvent) => {
      if (!elRef.value?.contains(e.target as Node)) {
        state.visible = false;
      }
    };

    onMounted(() => {
      // 捕获 => 冒泡
      // 之前为了阻止事件冒泡用了 stopPropagation
      document.addEventListener("mousedown", mousedown, true);
    });

    onBeforeMount(() => {
      document.removeEventListener("mousedown", mousedown, true);
    });

    provide("hide", () => (state.visible = false));

    return () => {
      return (
        <div ref={elRef} class={className.value} style={styles.value} {...state.option}>
          {state.option.content()}
        </div>
      );
    };
  }
});

let vm: VNode | null = null;
export function $dropdown(option: OptionProps) {
  if (!vm) {
    const el = document.createElement("div");
    // 将组件渲染成真实节点，放到页面上
    vm = createVNode(DropdownComponent, { option });
    // 将组件渲染到这个 el 上面
    render(vm, el);
    document.body.appendChild(el);
  }

  const { open } = vm.component?.exposed as any;
  open(option);
}
