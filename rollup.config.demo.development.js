import serve from 'rollup-plugin-serve';
import livereload from 'rollup-plugin-livereload';
import base from './rollup.config.demo';

export default {
  ...base,
  plugins: [...base.plugins, serve({ contentBase: 'public-dist', open: true, port: 3000 }), livereload()],
};
