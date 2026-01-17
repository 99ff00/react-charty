import commonjs from "@rollup/plugin-commonjs";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import terser from "@rollup/plugin-terser";
import typescript from "@rollup/plugin-typescript";
import url from "@rollup/plugin-url";
import external from "rollup-plugin-peer-deps-external";
import postcss from "rollup-plugin-postcss";

import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const pkg = require("./package.json");

const production = !process.env.ROLLUP_WATCH;
const sourcemap = !production ? "inline" : false;
const shouldMinify = process.env.ROLLUP_MINIFY === "true";
const extensions = [".js", ".jsx", ".ts", ".tsx"];

export default {
  input: "src/index.tsx",
  external: ["react", "react-dom", "prop-types"],
  output: [
    {
      file: pkg.main,
      format: "umd",
      name: "Charty",
      globals: {
        react: "React",
        "react-dom": "ReactDOM",
        "prop-types": "PropTypes",
      },
      sourcemap,
    },
    {
      file: pkg.module,
      format: "esm",
      sourcemap,
    },
  ],
  plugins: [
    external(),
    postcss({
      modules: true,
    }),
    url(),
    typescript({
      tsconfig: "./tsconfig.json",
    }),
    nodeResolve({ extensions }),
    commonjs(),
    shouldMinify && terser(),
  ],
};
