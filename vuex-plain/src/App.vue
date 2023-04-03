<script setup lang="ts">
import { computed } from "vue";
import { useStore } from "@/vuex";

const store = useStore("my");

console.log(store);

const count = computed(() => store.state.count);
const double = computed(() => store.getters.double);

const aCount = computed(() => store.state.aCount.count);
const bCount = computed(() => store.state.bCount.count);
const cCount = computed(() => store.state.aCount.cCount.count);
const dCount = computed(() => store.state.bCount.dCount.count);

const asyncAdd = () => {
  store.dispatch("asyncAdd", 1).then(() => {
    console.log("ok");
  });
};

const errorAdd = () => {
  store.state.count++;
};
</script>

<template>
  <!-- {{ $store }} -->
  {{ count }}
  <hr />
  {{ double }}
  <hr />
  <button @click="store.commit('add', 1)">同步修改</button>
  <button @click="asyncAdd">异步修改</button>
  <button @click="errorAdd">错误修改</button>

  <hr />
  a模块
  {{ aCount }}
  <button @click="store.commit('aCount/add', 1)">修改A</button>
  <hr />
  b模块
  {{ bCount }}
  <button @click="store.commit('bCount/add', 1)">修改B</button>
  <hr />
  c模块
  {{ cCount }}
  <button @click="store.commit('aCount/cCount/add', 1)">修改C</button>
  <hr />
  {{ dCount }}
  <button @click="store.commit('bCount/dCount/add', 1)">修改D</button>
</template>

<style scoped></style>
