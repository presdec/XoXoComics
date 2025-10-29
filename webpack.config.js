const path = require('path')

module.exports = {
  entry: './src/index.ts',
  target: 'node',
  mode: 'production',
  devtool: 'source-map',
  
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
  },
  
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'dist'),
    library: {
      type: 'commonjs2'
    },
    clean: true
  },
  
  externals: {
    // Don't bundle these, they should be provided by Paperback runtime
    'axios': 'axios',
    'cheerio': 'cheerio'
  },
  
  optimization: {
    minimize: true
  }
}