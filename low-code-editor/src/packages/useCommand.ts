import { cloneDeep } from "lodash-es";
import { ComputedRef, onUnmounted, WritableComputedRef } from "vue";
import { Block, EditorData } from "./editor-types";
import { events } from "./events";

type Command = {
  name: string;
  keyboard?: string;
  pushQueue?: boolean;
  execute: (...args: any[]) => ExecuteReturnType;
  init?: () => () => void;
  before?: null | Block[];
};

type ExecuteReturnType = { redo?: () => void; undo?: () => void };

export const useCommand = (
  data: WritableComputedRef<EditorData>,
  focusData: ComputedRef<{
    focus: Block[];
    unfocused: Block[];
  }>
) => {
  // 前进后退需要指针
  const state = {
    // 前进后退的索引值
    current: -1,
    // 存放所有的操作命令
    queue: [] as ExecuteReturnType[],
    // 制作命令和执行功能的一个映射表
    // undo: () => {}
    // redo:() => {}
    commands: {} as Record<string, (...args: any[]) => any>,
    // 存放所有的命令
    commandArray: [] as Command[],
    destroyArray: [] as (() => void)[]
  };

  const register = (command: Command) => {
    state.commandArray.push(command);
    // 命令名字对应的执行函数
    state.commands[command.name] = (...args: any[]) => {
      const { redo, undo } = command.execute(...args);
      redo?.();

      // 不需要放到队列中直接跳到即可
      if (!command.pushQueue) return;

      let { queue, current } = state;
      // 如果先放 组件1 组件2 组件3 组件4 撤回 组件3
      // 组件1 组件3
      if (queue.length > 0) {
        // 可能在放置的过程中有撤销操作，所以根据当前最新的 current 值来计算新的
        queue = queue.slice(0, current + 1);
        state.queue = queue;
      }

      // 保存指令的前进后退
      queue.push({ redo, undo });
      state.current = current + 1;
    };
  };

  // 注册我们需要的命令
  register({
    name: "redo",
    keyboard: "ctrl+y",
    execute() {
      return {
        redo() {
          // 找到下一步
          const item = state.queue[state.current + 1];
          if (item) {
            item.redo?.();
            state.current++;
          }
        }
      };
    }
  });

  register({
    name: "undo",
    keyboard: "ctrl+z",
    execute() {
      return {
        redo() {
          // 找到上一步
          if (state.current === -1) return;

          const item = state.queue[state.current];
          if (item) {
            item.undo?.();
            state.current--;
          }
        }
      };
    }
  });

  // 如果希望将操作放入到队列中 可以增加一个属性 标识等会操作放到队列中
  register({
    name: "drag",
    pushQueue: true,
    // 初始化操作 默认就会执行
    init() {
      this.before = null;

      // 监控拖拽开始事件 保存状态
      const start = () => {
        this.before = cloneDeep(data.value.blocks);
      };

      // 监控拖拽之后需要触发对应的指令
      const end = () => {
        state.commands.drag();
      };

      events.on("start", start);
      events.on("end", end);
      return () => {
        events.off("start", start);
        events.off("end", end);
      };
    },
    execute() {
      const before = this.before ?? [];
      const after = data.value.blocks;

      return {
        redo() {
          // 默认一松手 就直接把当前的事情做了
          data.value = { ...data.value, blocks: after };
        },
        undo() {
          // 前一步
          data.value = { ...data.value, blocks: before };
        }
      };
    }
  });

  // 更新整个容器
  register({
    name: "updateContainer",
    pushQueue: true,
    execute(val) {
      const before = data.value;
      const after = val;

      return {
        redo() {
          data.value = after;
        },
        undo() {
          data.value = before;
        }
      };
    }
  });

  // 更新一个
  register({
    name: "updateBlock",
    pushQueue: true,
    execute(newBlock, oldBlock) {
      const before = data.value.blocks;
      const after = (() => {
        const blocks = [...data.value.blocks];
        const index = data.value.blocks.indexOf(oldBlock);
        if (index > -1) {
          blocks.splice(index, 1, newBlock);
        }
        return blocks;
      })();

      return {
        redo() {
          data.value = { ...data.value, blocks: after };
        },
        undo() {
          data.value = { ...data.value, blocks: before };
        }
      };
    }
  });

  register({
    // 更新整个容器
    name: "placeTop",
    pushQueue: true,
    execute() {
      const before = cloneDeep(data.value.blocks);
      // 置顶就是在所有的 blocks 中找到最大的
      const after = (() => {
        const { focus, unfocused } = focusData.value;

        let maxZIndex = unfocused.reduce((prev, block) => {
          return Math.max(prev, block.zIndex);
        }, Number.MIN_SAFE_INTEGER);

        // 让当前选中的比最大的 + 1
        focus.forEach(block => (block.zIndex = maxZIndex + 1));

        return data.value.blocks;
      })();

      return {
        redo() {
          data.value = { ...data.value, blocks: after };
        },
        undo() {
          data.value = { ...data.value, blocks: before };
        }
      };
    }
  });

  register({
    // 更新整个容器
    name: "placeBottom",
    pushQueue: true,
    execute() {
      const before = cloneDeep(data.value.blocks);
      // 置顶就是在所有的 blocks 中找到最大的
      const after = (() => {
        const { focus, unfocused } = focusData.value;

        let minZIndex =
          unfocused.reduce((prev, block) => {
            return Math.min(prev, block.zIndex);
          }, Number.MAX_SAFE_INTEGER) - 1;

        if (minZIndex < 0) {
          const dur = Math.abs(minZIndex);
          minZIndex = 0;
          unfocused.forEach(block => (block.zIndex += dur));
        }

        // 不能直接 - 1 ，负值可能看不到
        focus.forEach(block => (block.zIndex = minZIndex));

        return data.value.blocks;
      })();

      return {
        redo() {
          data.value = { ...data.value, blocks: after };
        },
        undo() {
          data.value = { ...data.value, blocks: before };
        }
      };
    }
  });

  register({
    name: "delete",
    pushQueue: true,
    execute() {
      const before = cloneDeep(data.value.blocks);
      const after = focusData.value.unfocused;

      console.log(before, after);

      return {
        redo() {
          data.value = { ...data.value, blocks: after };
        },
        undo() {
          data.value = { ...data.value, blocks: before };
        }
      };
    }
  });

  const keyboardEvent = (() => {
    const keydown = (e: KeyboardEvent) => {
      const { ctrlKey, key } = e;
      const keyString: string[] = [];
      if (ctrlKey) {
        keyString.push("ctrl");
      }
      keyString.push(key);
      const keyStr = keyString.join("+");

      state.commandArray.forEach(({ keyboard, name }) => {
        if (!keyboard) return;

        if (keyboard === keyStr) {
          state.commands[name]();
          e.preventDefault();
        }
      });
    };

    // 初始化事件
    window.addEventListener("keydown", keydown);
    const init = () => {
      return () => {
        // 销毁函数事件
        window.removeEventListener("keydown", keydown);
      };
    };

    return init;
  })();

  (() => {
    state.destroyArray.push(keyboardEvent());
    // 箭头键盘事件
    state.commandArray.forEach(command => {
      const destroy = command.init?.();
      destroy && state.destroyArray.push(destroy);
    });
  })();

  onUnmounted(() => {
    state.destroyArray.forEach(fn => fn());
  });

  return state;
};
