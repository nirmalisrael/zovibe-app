const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('metro-config').MetroConfig}
 */
const config = {
  transformer: {
    assetRegistryPath: '@react-native/assets-registry/registry.js',
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
