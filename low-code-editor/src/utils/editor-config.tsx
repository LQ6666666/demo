import { ElButton, ElInput, ElOption, ElSelect } from "element-plus";
import { VNode } from "vue";

import Range from "@/components/Range";

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
const createInputProp = (label: string) => ({ type: "input", label });
const createColorProp = (label: string) => ({ type: "color", label });
const createSelectProp = (label: string, options: { value: string; label: string }[]) => ({
  type: "select",
  label,
  options
});
const createTableProp = (label: string, table: any) => ({
  type: "table",
  label,
  table
});

export type ConfigType = typeof registerConfig;

registerConfig.register({
  label: "下拉框",
  resize: {
    width: true
  },
  preview: () => <ElSelect></ElSelect>,
  render: ({ props, model, size }) => (
    <ElSelect {...model.default} style={{ height: size.height + "px", width: size.width + "px" }}>
      {props.options?.map((item: any) => (
        <ElOption label={item.label} value={item.value}></ElOption>
      ))}
    </ElSelect>
  ),
  key: "select",
  props: {
    options: createTableProp("下拉选项", {
      options: [
        { label: "显示值", field: "label" },
        { label: "绑定值", field: "value" }
      ],
      // 显示给用户的值
      key: "label"
    })
  },
  model: {
    default: "绑定字段"
  }
});

registerConfig.register({
  label: "文本",
  preview: () => "预览文本",
  render: ({ props }) => (
    <span style={{ color: props.color, fontSize: props.size }}>{props.text || "渲染文本"}</span>
  ),
  key: "text",
  props: {
    text: createInputProp("文本内容"),
    color: createColorProp("字体颜色"),
    size: createSelectProp("字体大小", [
      { label: "14px", value: "14px" },
      { label: "18px", value: "18px" },
      { label: "20px", value: "20px" },
      { label: "24px", value: "24px" }
    ])
  }
});

registerConfig.register({
  label: "按钮",
  resize: {
    // 可以更改宽度
    height: true,
    width: true
  },
  preview: () => <ElButton>预览按钮</ElButton>,
  render: ({ props, size }) => (
    <ElButton
      style={{ height: size.height + "px", width: size.width + "px" }}
      type={props.type}
      size={props.size}
    >
      {props.text || "渲染按钮"}
    </ElButton>
  ),
  key: "button",
  props: {
    text: createInputProp("按钮内容"),
    type: createSelectProp("按钮类型", [
      { label: "基础", value: "primary" },
      { label: "成功", value: "success" },
      { label: "警告", value: "warning" },
      { label: "危险", value: "danger" }
    ]),
    size: createSelectProp("按钮尺寸", [
      { label: "默认", value: "default" },
      { label: "小", value: "small" },
      { label: "大", value: "large" }
    ])
  }
});

registerConfig.register({
  label: "输入框",
  resize: {
    // 可以更改宽度
    width: true
  },
  preview: () => <ElInput placeholder="预览输入框" />,
  render: ({ model, size }) => (
    <ElInput
      style={{ height: size.height + "px", width: size.width + "px" }}
      {...model.default}
      placeholder="渲染输入框"
    />
  ),
  key: "input",
  model: {
    default: "绑定字段"
  }
});

registerConfig.register({
  label: "范围选择器",
  preview: () => <Range placeholder="预览范围选择器" />,
  render: ({ model }) => (
    <Range
      {...{
        start: model.start.modelValue,
        "onUpdate:start": model.start["onUpdate:modelValue"],
        end: model.end.modelValue,
        "onUpdate:end": model.end["onUpdate:modelValue"]
      }}
      placeholder="渲染范围选择器"
    />
  ),
  key: "range",
  model: {
    start: "开始范围字段",
    end: "结束范围字段"
  }
});
