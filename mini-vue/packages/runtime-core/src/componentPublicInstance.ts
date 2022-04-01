import { hasOwn } from "@vue3/shared";

export const PublicInstanceProxyHandlers: ProxyHandler<any> = {
    get({ _: instance }, key) {
        // 取值时，要访问 setupState proxy  data
        const { setupState, props, data } = instance;

        if ((key as string)[0] === "$") {
            return;
        }

        if (hasOwn(setupState, key)) {
            return setupState[key];
        } else if (hasOwn(props, key)) {
            return props[key];
        } else if (hasOwn(data, key)) {
            return data[key];
        } else {
            return void 0;
        }
    },
    set({ _: instance }, key, value) {
        const { setupState, props, data } = instance;

        if (hasOwn(setupState, key)) {
            setupState[key] = value;
        } else if (hasOwn(props, key)) {
            props[key] = value;
        } else if (hasOwn(data, key)) {
            data[key] = value;
        }

        return true;
    }
}