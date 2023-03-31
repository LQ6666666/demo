import { $tableDialog } from "@/components/TableDialog";
import { ElButton, ElTag } from "element-plus";
import { cloneDeep } from "lodash-es";
import { computed, defineComponent, PropType } from "vue";

export default defineComponent({
  props: {
    modelValue: {
      type: Array as PropType<any[]>
    },
    propsConfig: {
      type: Object as PropType<any>
    }
  },
  emits: ["update:modelValue"],
  setup(props, { emit }) {
    const data = computed({
      get() {
        return props.modelValue || [];
      },
      set(val) {
        emit("update:modelValue", cloneDeep(val));
      }
    });

    const add = () => {
      $tableDialog({
        config: props.propsConfig,
        data: data.value,
        onConfirm(val: any) {
          // 更新数据
          data.value = val;
        }
      });
    };

    return () => (
      <div>
        {
          // 没有任何数据，直接显示一个按钮就行
          (!data.value || data.value.length === 0) && <ElButton onClick={add}>添加</ElButton>
        }
        {(data.value || []).map(item => (
          <ElTag onClick={add}>{item[props.propsConfig.table.key]}</ElTag>
        ))}
      </div>
    );
  }
});
