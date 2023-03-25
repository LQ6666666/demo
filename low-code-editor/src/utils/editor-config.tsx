import { ElButton, ElInput } from "element-plus";
import { VNode } from "vue";

// 列表区可以显示所有的物料
// key 对应的组件映射关系

export interface EditorComponent {
  label: string;
  preview: (...args: any[]) => VNode | string;
  render: (...args: any[]) => VNode | string;
  key: string;
  [k: string]: any;
}

function createEditorConfig() {
  const componentList: EditorComponent[] = [];
  const componentMap: Record<string, EditorComponent> = {};

  return {
    componentList,
    componentMap,
    register: (component: EditorComponent) => {
      componentList.push(component);
      componentMap[component.key] = component;
    }
  };
}

export const registerConfig = createEditorConfig();

export type ConfigType = typeof registerConfig;

registerConfig.register({
  label: "文本",
  preview: () => "预览文本",
  render: () => "渲染文本",
  key: "text"
});

registerConfig.register({
  label: "按钮",
  preview: () => <ElButton>预览按钮</ElButton>,
  render: () => <ElButton>渲染按钮</ElButton>,
  key: "button"
});

registerConfig.register({
  label: "输入框",
  preview: () => <ElInput placeholder="预览输入框" />,
  render: () => <ElInput placeholder="渲染输入框" />,
  key: "input"
});
