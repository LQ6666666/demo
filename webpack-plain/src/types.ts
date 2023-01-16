import Compiler from "./Compiler";
import { SyncHook } from "tapable";

export interface WebpackOption {
  mode?: "production" | "development" | "none";
  entry: Record<string, string> | string;
  context?: string;
  output: {
    path: string;
    filename: string;
  };
  resolve?: {
    extensions?: string[];
  };
  module?: {
    rules?: {
      test: RegExp;
      use: string[];
    }[];
  };
  plugins?: WebpackPlugin[];
}

export interface WebpackPlugin {
  apply: (compiler: Compiler) => any;
}

export type CompilerHooks = {
  run: SyncHook<any>;
  emit: SyncHook<any>;
  done: SyncHook<any>;
};

export interface WebpackStats {
  toJson: () => {
    entries: Set<WebpackChunk>;
    chunks: Set<WebpackChunk>;
    modules: WebpackModule[];
    files: string[];
    assets: WebpackAssets;
  };
}

export interface WebpackModule {
  id: string;
  name: string;
  dependencies: string[];
  _source: string;
}

export interface WebpackChunk {
  name: string;
  entryModule: WebpackModule;
  modules: WebpackModule[];
}

export type WebpackAssets = Record<string, string>;
