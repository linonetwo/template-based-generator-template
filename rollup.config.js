import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import { babel } from '@rollup/plugin-babel';

export default {
  input: './src/index.ts',
  output: {
    file: './dist/index.mjs',
    format: 'esm',
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
