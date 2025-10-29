const path = require('path')

module.exports = {
  entry: './src/index.js',
  target: 'node',
  mode: 'production',
  devtool: 'source-map',
  
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env']
          }
        }
      },
    ],
  },
  
  resolve: {
    extensions: ['.js', '.ts'],
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