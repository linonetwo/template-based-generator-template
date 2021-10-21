import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import babel from '@rollup/plugin-babel';
// import replace from '@rollup/plugin-replace';

export default {
  input: 'demo/app.tsx',
  output: {
    file: 'public-dist/bundle.js',
    format: 'iife',
  },
  plugins: [
    resolve({ extensions: ['.ts', '.tsx', '.js', '.jsx'] }),
    commonjs(),
    babel({ babelHelpers: 'bundled', extensions: ['.ts', '.tsx'] }),
    // replace({
    //   'process.env.NODE_ENV': JSON.stringify('production'),
    // }),
  ],
};
