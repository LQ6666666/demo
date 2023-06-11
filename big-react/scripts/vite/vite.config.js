import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import { resolvePkgPath } from "../rollup/utils";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  console.log(mode);

  return {
    root: path.resolve(__dirname, "..", "..", "demos"),
    define: {
      __DEV__: true
    },
    server: {
      port: 8000
    },
    plugins: [react()],
    resolve: {
      alias: [
        { find: "react", replacement: path.join(resolvePkgPath("react"), "src") },
        { find: "react-dom", replacement: path.join(resolvePkgPath("react-dom"), "src") },
        {
          find: "@react/react-reconciler",
          replacement: path.join(resolvePkgPath("react-reconciler"), "src")
        },
        {
          find: "@react/react-noop-renderer",
          replacement: path.join(resolvePkgPath("react-noop-renderer"), "src")
        },
        {
          find: "@react/shared",
          replacement: path.join(resolvePkgPath("shared"), "src")
        },
        {
          find: "hostConfig",
          replacement: path.join(resolvePkgPath("react-dom"), "src", "hostConfig.ts")
          // replacement: path.join(resolvePkgPath("react-noop-renderer"), "src", "hostConfig.ts")
        }
      ]
    }
  };
});
