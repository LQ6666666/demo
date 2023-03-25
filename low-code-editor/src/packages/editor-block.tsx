import {
  computed,
  defineComponent,
  type PropType,
  type CSSProperties,
  inject,
  onMounted,
  ref
} from "vue";
import { type Block } from "./editor-types";
import { configKey } from "@/utils/injection-key";

import "./editor-block.scss";

export default defineComponent({
  props: {
    block: {
      type: Object as PropType<Block>,
      required: true
    }
  },
  setup(props) {
    const blockStyle = computed<CSSProperties>(() => ({
      top: `${props.block.top}px`,
      left: `${props.block.left}px`,
      zIndex: props.block.zIndex
    }));

    const config = inject(configKey)!;

    const blockRef = ref<HTMLElement>();
    onMounted(() => {
      let { offsetWidth, offsetHeight } = blockRef.value!;

      if (props.block.alignCenter) {
        // 说明是拖拽松手的才渲染的，其他的默认渲染到页面上不需要居中

        // 简单写了直接修改 原则上要重新派发事件，才能去居中
        props.block.top = props.block.top - offsetHeight / 2;
        props.block.left = props.block.left - offsetWidth / 2;
        props.block.alignCenter = false;
      }
    });

    return () => {
      const component = config.componentMap[props.block.key];
      const RenderComponent = component.render();
      return (
        <div class="editor-block" style={blockStyle.value} ref={blockRef}>
          {RenderComponent}
        </div>
      );
    };
  }
});
