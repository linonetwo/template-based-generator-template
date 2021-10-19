import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import { babel } from '@rollup/plugin-babel';
import disablePackages from 'rollup-plugin-disable-packages';

export default {
  input: './src/index.ts',
  output: {
    file: './dist/index.js',
    format: 'commonjs',
    sourcemap: 'inline',
    exports: 'named',
  },
  plugins: [
    nodeResolve({ extensions: ['.js', '.ts'], browser: true }),
    commonjs(),
    babel({
      exclude: 'node_modules/**',
      extensions: ['.js', '.ts'],
    }),
    json(),
  ],
};
