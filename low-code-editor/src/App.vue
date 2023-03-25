<script setup lang="ts">
import { provide, ref } from "vue";

import Editor from "@/packages/editor";
import { registerConfig as config } from "@/utils/editor-config";
import { configKey } from "@/utils/injection-key";
import data from "./data.json";

const state = ref(data);
// 组件的配置直接传
provide(configKey, config);
</script>

<template>
  <div class="app-main">
    <Editor v-model="state" />
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
