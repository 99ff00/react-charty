import babel from 'rollup-plugin-babel'
import commonjs from 'rollup-plugin-commonjs'
import external from 'rollup-plugin-peer-deps-external'
import { terser } from 'rollup-plugin-terser'
import postcss from 'rollup-plugin-postcss'
import resolve from 'rollup-plugin-node-resolve'
import url from 'rollup-plugin-url'

import pkg from './package.json'

const production = !process.env.ROLLUP_WATCH;
const sourcemap = !production ? 'inline' : false;

export default {
  input: 'src/index.js',
  output: [
    {
      file: pkg.main,
      format: 'cjs',
      sourcemap
    },
    {
      file: pkg.module,
      format: 'es',
      sourcemap
    }
  ],
  plugins: [
    external(),
    postcss({
      modules: true
    }),
    url(),
    babel({
      exclude: 'node_modules/**',
      plugins: [ 'external-helpers' ]
    }),
    resolve(),
    commonjs(),
    production && terser()
  ]
}
