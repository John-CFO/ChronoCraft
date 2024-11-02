const { getDefaultConfig } = require("@expo/metro-config");

const defaultConfig = getDefaultConfig(__dirname);
defaultConfig.resolver.sourceExts.push("cjs", "jsx", "js", "ts", "tsx", "json");

module.exports = defaultConfig;
