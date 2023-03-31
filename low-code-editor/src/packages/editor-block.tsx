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

import BlockResize from "./block-resize";

import "./editor-block.scss";

export default defineComponent({
  props: {
    block: {
      type: Object as PropType<Block>,
      required: true
    },
    preview: {
      type: Boolean,
      required: true
    },
    formData: {
      type: Object,
      required: true
    }
  },
  inheritAttrs: true,
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

      props.block.width = offsetWidth;
      props.block.height = offsetHeight;
    });

    return () => {
      const component = config.componentMap[props.block.key];

      const RenderComponent = component.render({
        size: props.block.hasResize ? {width:props.block.width, height:props.block.height} :{},
        props: props.block.props,
        model: Object.keys(component.model ?? {}).reduce((prev: any, modelName) => {
          const propName = props.block.model[modelName];

          prev[modelName] = {
            modelValue: props.formData[propName],
            "onUpdate:modelValue": (v: any) => (props.formData[propName] = v)
          };

          return prev;
        }, {})
      });

      const { width, height }: Record<string, boolean | undefined> = component.resize || {};

      return (
        <div
          class={{
            "editor-block": true,
            "editor-block-focus": !!props.block.focus,
            "editor-block-preview": props.preview
          }}
          style={blockStyle.value}
          ref={blockRef}
        >
          {RenderComponent}

          {props.block.focus && (width || height) && (
            <BlockResize block={props.block} component={component} />
          )}
        </div>
      );
    };
  }
});
