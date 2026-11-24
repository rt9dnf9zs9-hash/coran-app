// Monorepo : Metro doit voir packages/core (logique partagée avec le web).
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');
const config = getDefaultConfig(projectRoot);
config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [path.resolve(projectRoot, 'node_modules'), path.resolve(workspaceRoot, 'node_modules')];
config.resolver.extraNodeModules = { '@coran/core': path.resolve(workspaceRoot, 'packages/core/src') };
module.exports = config;
