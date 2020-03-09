var path = require('path')

module.exports = {
  mode: 'development',
  entry: './src/entries/index.js',
  output: {
    filename: 'v1.1.js'
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        use: [{
          loader: 'babel-loader',
        }],
        include: __dirname
      }
    ]
  },
  resolve: {
    modules: [
      path.resolve('./src')
    ]
  }
}