import { reactive, WritableComputedRef, type ComputedRef } from "vue";
import { Block, EditorData } from "./editor-types";
import { events } from "./events";

type Lines = {
  x: { showLeft: number; left: number }[];
  y: { showTop: number; top: number }[];
};

export const useBlockDragger = (
  focusData: ComputedRef<{
    focus: Block[];
    unfocused: Block[];
  }>,
  lastSelectBlock: ComputedRef<Block>,
  data: WritableComputedRef<EditorData>
) => {
  let dragState = {
    startX: 0,
    startY: 0,
    startLeft: 0,
    startTop: 0,
    startPos: [] as { top: number; left: number }[],
    lines: { x: [], y: [] } as Lines,
    // 默认不是正在拖拽
    dragging: false
  };

  const markLine = reactive<{ x: null | number; y: null | number }>({ x: null, y: null });

  const mousedown = (e: MouseEvent) => {
    // 拖拽最后的元素
    const { width: BWidth, height: BHeight } = lastSelectBlock.value;

    dragState = {
      dragging: false,
      startX: e.clientX,
      startY: e.clientY,
      // B 点拖拽前的位置 left top
      startLeft: lastSelectBlock.value.left,
      startTop: lastSelectBlock.value.top,
      // 记录每一个选中的位置
      startPos: focusData.value.focus.map(({ top, left }) => ({ top, left })),
      lines: (() => {
        // 参照物
        // 获取其他没选中的，以他们的位置做辅助线
        let unfocused = focusData.value.unfocused as {
          top: number;
          left: number;
          width: number;
          height: number;
        }[];

        unfocused = [
          {
            top: 0,
            left: 0,
            width: data.value.container.width,
            height: data.value.container.height
          }
        ].concat(unfocused);

        // 横向的线放在 y
        // 纵向的线放在 x
        const lines: Lines = { x: [], y: [] };

        unfocused.forEach(block => {
          const { top: ATop, left: ALeft, width: AWidth, height: AHeight } = block;

          // 当此元素拖拽到和 A 元素一致的时候，要显示这跟辅助线，辅助线的位置就是 ATop
          // 顶对顶
          lines.y.push({ showTop: ATop, top: ATop });
          // 顶对底
          lines.y.push({ showTop: ATop, top: ATop - BHeight! });
          // 中对中
          lines.y.push({ showTop: ATop + AHeight! / 2, top: ATop + AHeight! / 2 - BHeight! / 2 });
          // 底对顶
          lines.y.push({ showTop: ATop + AHeight!, top: ATop + AHeight! });
          // 底对底
          lines.y.push({ showTop: ATop + AHeight!, top: ATop + AHeight! - BHeight! });

          // 左对左
          lines.x.push({ showLeft: ALeft, left: ALeft });
          // 右对左
          lines.x.push({ showLeft: ALeft + AWidth!, left: ALeft + AWidth! });
          // 中对中
          lines.x.push({ showLeft: ALeft + AWidth! / 2, left: ALeft + AWidth! / 2 - BWidth! / 2 });
          // 右对右
          lines.x.push({ showLeft: ALeft + AWidth!, left: ALeft + AWidth! - BWidth! });
          // 左对右
          lines.x.push({ showLeft: ALeft, left: ALeft - BWidth! });
        });

        return lines;
      })()
    };

    document.addEventListener("mousemove", mousemove);
    document.addEventListener("mouseup", mouseup);
  };

  const mousemove = (e: MouseEvent) => {
    let { clientX: moveX, clientY: moveY } = e;

    if (!dragState.dragging) {
      dragState.dragging = true;
      // 触发事件，就会记住拖拽前的位置
      events.emit("start");
    }

    // 计算当前元素的最新的 left 和 top 去线里面找，找到显示线
    // 鼠标移动后 - 鼠标移动前 + left
    const left = moveX - dragState.startX + dragState.startLeft;
    const top = moveY - dragState.startY + dragState.startTop;

    // 先计算横线，距离参照物元素还有 5 像素的时候，就去显示这跟线
    let y: number | null = null;
    let x: number | null = null;
    for (let i = 0; i < dragState.lines.y.length; i++) {
      // 获取每一根线
      const { top: t, showTop: s } = dragState.lines.y[i];
      // 如果小于 5 说明接近了
      if (Math.abs(t - top) <= 5) {
        y = s;
        // 实现快速和这个元素贴在一起
        // 容器距离顶部的距离 + 目标的高度就是最新的 moveT
        moveY = dragState.startY - dragState.startTop + t;
        // 找到一根线就跳出循环
        break;
      }
    }

    for (let i = 0; i < dragState.lines.x.length; i++) {
      // 获取每一根线
      const { left: l, showLeft: s } = dragState.lines.x[i];
      // 如果小于 5 说明接近了
      if (Math.abs(l - left) <= 5) {
        x = s;
        // 实现快速和这个元素贴在一起
        // 容器距离顶部的距离 + 目标的高度就是最新的 moveT
        moveX = dragState.startX - dragState.startLeft + l;
        // 找到一根线就跳出循环
        break;
      }
    }

    // markLine 时响应式数据 x y 更新会导致 视图更新
    markLine.x = x;
    markLine.y = y;

    // 之前和之后的距离
    const durX = moveX - dragState.startX;
    const durY = moveY - dragState.startY;

    focusData.value.focus.forEach((block, index) => {
      block.top = dragState.startPos[index].top + durY;
      block.left = dragState.startPos[index].left + durX;
    });
  };

  const mouseup = (e: MouseEvent) => {
    document.removeEventListener("mousemove", mousemove);
    document.removeEventListener("mouseup", mouseup);

    markLine.x = null;
    markLine.y = null;

    if (dragState.dragging) {
      dragState.dragging = false;
      // 触发事件，就会记住拖拽前的位置
      events.emit("end");
    }
  };

  return { mousedown, markLine };
};
