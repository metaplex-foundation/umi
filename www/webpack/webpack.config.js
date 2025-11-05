import path from 'path';
import { fileURLToPath } from 'url';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import webpack from 'webpack';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default {
  target: 'web',
  entry: './src/main.ts',
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'dist'),
    clean: true,
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
    modules: [
      'node_modules',
      path.resolve(__dirname, '../../node_modules'),
    ],
    alias: {
      process: path.resolve(__dirname, '../../node_modules/.pnpm/process@0.11.10/node_modules/process/browser.js'),
    },
    // NOTE: No custom conditionNames needed - webpack respects package.json export order by default
    fallback: {
      buffer: 'buffer',
      crypto: 'crypto-browserify',
      stream: 'stream-browserify',
      vm: false,
      http: false,
      https: false,
      zlib: false,
      util: false,
      fs: false,
      path: false,
      os: false,
      tty: false,
      readline: false,
      assert: false,
      'child_process': false,
      'stream/promises': false,
    },
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './src/index.html',
    }),
    new webpack.ProvidePlugin({
      Buffer: ['buffer', 'Buffer'],
      process: path.resolve(__dirname, '../../node_modules/.pnpm/process@0.11.10/node_modules/process/browser.js'),
    }),
    new webpack.DefinePlugin({
      'process.env': JSON.stringify({}),
      'process.version': JSON.stringify('v18.0.0'),
      'process.versions': JSON.stringify({ node: '18.0.0' }),
      global: 'globalThis',
    }),
  ],
  devServer: {
    static: {
      directory: path.join(__dirname, 'dist'),
    },
    compress: true,
    port: 9000,
    hot: true,
  },
};
