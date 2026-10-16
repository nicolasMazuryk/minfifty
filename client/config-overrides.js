const {
  override,
  adjustStyleLoaders,
  addWebpackResolve,
  addWebpackAlias,
  addDecoratorsLegacy,
  removeModuleScopePlugin,
  babelInclude,
} = require('customize-cra')
const addLessLoader = require('customize-cra-less-loader')
const path = require('path')
const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin')

module.exports = override(
  addLessLoader({
    lessLoaderOptions: {
      lessOptions: {
        javascriptEnabled: true,
      },
    },
  }),
  adjustStyleLoaders(({ use: [, css, postcss, resolve, processor] }) => {
    // allow aliased import of mixins, variables, i.e. `@import 'core.scss'`
    if (processor && processor.loader.includes('sass-loader')) {
      processor.options.sassOptions = {
        includePaths: [path.resolve(__dirname, 'src/assets/styles')],
      }
    }
  }),
  addWebpackResolve({ plugins: [new TsconfigPathsPlugin()] }),
  addDecoratorsLegacy(),
  removeModuleScopePlugin(),
  babelInclude([path.resolve('src'), path.resolve(__dirname, '../strategy/common')]),
  addWebpackAlias({
    '@common': path.resolve(__dirname, '../strategy/common'),
    '@styles': path.resolve(__dirname, './src/assets/styles'),
    '@assets': path.resolve(__dirname, './src/assets'),
  }),
)
