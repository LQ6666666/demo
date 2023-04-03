import { createStore, Store } from "@/vuex";

function customPlugin(store: Store<any>) {
  let local = localStorage.getItem("VUEX:STATE");
  if (local) {
    store.replaceState(JSON.parse(local));
  }
  // 每当状态发生变化
  store.subscribe((mutation, state) => {
    localStorage.setItem("VUEX:STATE", JSON.stringify(state));
  });
}

const store = createStore({
  // 开启严格模式：不允许用户非法操作状态(只能在 mutation 中修改)
  strict: true,
  // 会按照注册的顺序依次执行插件，执行的时候会把 store 传过去
  plugins: [customPlugin],
  state: {
    count: 0
  },
  getters: {
    double(state) {
      return state.count * 2;
    }
  },
  mutations: {
    add(state, payload: number) {
      state.count += payload;
    }
  },
  actions: {
    asyncAdd({ commit }, payload: number) {
      return new Promise(resolve => {
        setTimeout(() => {
          commit("add", payload);
          resolve(void 0);
        }, 1000);
      });
    }
  },
  modules: {
    aCount: {
      namespace: true,
      state: { count: 0 },
      mutations: {
        add(state: any, payload: number) {
          state.count += payload;
        }
      },
      modules: {
        cCount: {
          namespace: true,
          state: { count: 0 },
          mutations: {
            add(state: any, payload: number) {
              state.count += payload;
            }
          }
        }
      }
    },
    bCount: {
      namespace: true,
      state: { count: 0 },
      mutations: {
        add(state: any, payload: number) {
          state.count += payload;
        }
      }
    }
  }
});

store.registerModule(["bCount", "dCount"], {
  namespace: true,
  state: { count: 0 },
  mutations: {
    add(state: any, payload: number) {
      state.count += payload;
    }
  }
});

export default store;
