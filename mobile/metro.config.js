// Metro: resolve the shared contracts package (../packages/contracts) that
// desktop and mobile both build on, without publishing it.
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);
const contracts = path.resolve(__dirname, '../packages/contracts');
config.watchFolders = [...(config.watchFolders || []), contracts];
config.resolver.nodeModulesPaths = [path.resolve(__dirname, 'node_modules')];
config.resolver.extraNodeModules = { ...(config.resolver.extraNodeModules || {}), '@starlane/contracts': path.join(contracts, 'src') };
module.exports = config;
