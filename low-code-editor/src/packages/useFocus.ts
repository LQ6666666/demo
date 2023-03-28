import { computed, type Ref, ref, type WritableComputedRef } from "vue";
import type { Block, EditorData } from "./editor-types";

export const useFocus = (
  data: WritableComputedRef<EditorData>,
  previewRef: Ref<boolean>,
  callback: (e: MouseEvent) => void
) => {
  // 表示没有任何一个被选中
  const selectedIndex = ref(-1);
  // 最后选择的那一个
  const lastSelectBlock = computed(() => data.value.blocks[selectedIndex.value]);

  const clearBlockFocus = () => {
    data.value.blocks.forEach(block => (block.focus = false));
  };

  const blockMousedown = (e: MouseEvent, block: Block, index: number) => {
    if (previewRef.value) return;

    e.preventDefault();
    e.stopPropagation();

    // block 上我们规划一个属性 focus 获取焦点后 就将 focus 变为 true
    if (e.shiftKey) {
      if (focusData.value.focus.length <= 1) {
        // 只有一个节点被选中时，按住 shift 键也不会切换 focus
        block.focus = true;
      } else {
        block.focus = !block.focus;
      }
    } else {
      if (!block.focus) {
        clearBlockFocus();
        // 要清空其他的 focus 属性
        // 当自己已经被选中了，再次选中时还是选中状态
        block.focus = true;
      }
    }

    selectedIndex.value = index;
    callback(e);
  };

  const focusData = computed(() => {
    let focus: Block[] = [];
    let unfocused: Block[] = [];

    data.value.blocks.forEach(block => (block.focus ? focus : unfocused).push(block));
    return { focus, unfocused };
  });

  const containerMousedown = () => {
    if (previewRef.value) return;

    // 点击容器让选中的失去焦点
    clearBlockFocus();
    selectedIndex.value = -1;
  };

  return { blockMousedown, focusData, clearBlockFocus, containerMousedown, lastSelectBlock };
};
