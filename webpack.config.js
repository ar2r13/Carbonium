const path = require('path')

module.exports = {
	context: path.resolve(__dirname, './src'),
	entry: {
		component: './Component.js'
	},
	output: {
		filename: '[name].js',
		path: path.resolve(__dirname, 'dist')
	},
	module: {
		rules: [{
			test: /\.js$/,
			include: [path.resolve(__dirname, 'src')],
			use: [{
				loader: 'babel-loader'
			}],
		}]
	},
	devtool: 'source-map'
}