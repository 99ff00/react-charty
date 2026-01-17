import { nodeResolve } from "@rollup/plugin-node-resolve";
import terser from "@rollup/plugin-terser";
import typescript from "@rollup/plugin-typescript";

// Plugin to replace CSS imports with empty object for standalone build
function cssStub() {
  return {
    name: "css-stub",
    resolveId(source) {
      if (source.endsWith(".css")) {
        return source;
      }
      return null;
    },
    load(id) {
      if (id.endsWith(".css")) {
        return "export default {};";
      }
      return null;
    },
  };
}

export default {
  input: "src/charty.ts",
  output: {
    file: "dist/charty.min.js",
    format: "iife",
    name: "Charty",
    banner: "/*\n *  Copyright (c) 2019-present, Aleksandr Telegin\n *\n * This source code is licensed under the MIT license.\n */",
  },
  plugins: [
    cssStub(),
    typescript({
      tsconfig: "./tsconfig.standalone.json",
      compilerOptions: {
        declaration: false,
      },
    }),
    nodeResolve(),
    terser({
      format: {
        comments: /Copyright/,
      },
    }),
  ],
};
