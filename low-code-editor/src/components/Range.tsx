import { computed, defineComponent } from "vue";

export default defineComponent({
  props: {
    start: {
      type: Number
    },
    end: {
      type: Number
    }
  },
  emits: ["update:start", "update:end"],
  setup(props, { emit }) {
    const start = computed({
      get() {
        return props.start;
      },
      set(val) {
        return emit("update:start", +(val ?? 0));
      }
    });

    const end = computed({
      get() {
        return props.end;
      },
      set(val) {
        return emit("update:end", +(val ?? 0));
      }
    });

    return () => (
      <div class="range">
        <input type="text" v-model={start.value} />
        <span>~</span>
        <input type="text" v-model={end.value} />
      </div>
    );
  }
});
