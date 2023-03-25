import { type InjectionKey } from "vue";
import { type ConfigType } from "./editor-config";

export const configKey = Symbol() as InjectionKey<ConfigType>;
