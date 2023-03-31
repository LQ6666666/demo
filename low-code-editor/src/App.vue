<script setup lang="ts">
import { provide, reactive, ref } from "vue";

import Editor from "@/packages/editor";
import { registerConfig as config } from "@/utils/editor-config";
import { configKey } from "@/utils/injection-key";
import data from "./data.json";
import { EditorData } from "./packages/editor-types";

const state = ref(data as EditorData);
// 组件的配置直接传
provide(configKey, config);

const formData = ref({
  username: "lq",
  password: "123",
  start: 0,
  end: 100
});
</script>

<template>
  <div class="app-main">
    <Editor v-model="state" :formData="formData" />
  </div>
</template>

<style lang="scss" scoped>
.app-main {
  position: fixed;
  height: 100%;
  top: 20px;
  left: 20px;
  right: 20px;
}
</style>
