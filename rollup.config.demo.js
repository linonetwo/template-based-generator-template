import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import babel from '@rollup/plugin-babel';
import replace from '@rollup/plugin-replace';
import nodePolyfills from 'rollup-plugin-polyfill-node';
import globals from '@crokita/rollup-plugin-node-globals';
import json from '@rollup/plugin-json';

export default {
  input: 'demo/app.tsx',
  output: {
    file: 'public-dist/bundle.js',
    format: 'iife',
    globals: {
      global: 'window',
    },
  },
  plugins: [
    nodeResolve({ extensions: ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.mts'], browser: true }),
    commonjs(),
    nodePolyfills({ include: ['process', 'os', 'tty'] }),
    babel({ exclude: 'node_modules/**', babelHelpers: 'bundled', extensions: ['.ts', '.tsx'] }),
    json(),
    replace({
      'process.env.NODE_ENV': JSON.stringify('production'),
    }),
  ],
};
