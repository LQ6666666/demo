import { defaults } from "jest-config";

export default {
  ...defaults,
  rootDir: process.cwd(),
  modulePathIgnorePatterns: ["<rootDir/>.history"],
  moduleDirectories: [
    // 对于React ReactDOM
    "dist/node_modules",
    // 对于第三方依赖
    ...defaults.moduleDirectories
  ],
  moduleNameMapper: {
    "^scheduler$": "<rootDir>/node_modules/scheduler/unstable_mock.js"
  },
  testEnvironment: "jsdom",
  fakeTimers: {
    enableGlobally: true,
    legacyFakeTimers: true
  },
  setupFilesAfterEnv: ["./scripts/jest/setupJest.js"]
};
