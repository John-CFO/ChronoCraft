// // Learn more https://docs.expo.io/guides/customizing-metro
// const { getDefaultConfig } = require('expo/metro-config');

// /** @type {import('expo/metro-config').MetroConfig} */
// const config = getDefaultConfig(__dirname);

// module.exports = config;

const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

// Erweiterte Standardkonfiguration
const config = getDefaultConfig(__dirname);

// Erforderliche Anpassungen für Firebase und Reanimated
config.resolver = {
  ...config.resolver,
  extraNodeModules: {
    ...config.resolver.extraNodeModules,
    "react-native": path.resolve(__dirname, "node_modules/react-native"),
    firebase: path.resolve(__dirname, "node_modules/firebase"),
  },
  assetExts: [...config.resolver.assetExts, "db", "sqlite"],
};

// Source Maps für Produktionsbuilds optimieren
config.transformer.minifierConfig = {
  keep_classnames: true,
  keep_fnames: true,
  mangle: { keep_classnames: true },
};
