const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Enable package exports (needed for some React Query packages)
config.resolver.unstable_enablePackageExports = true;

module.exports = config;
