/**
 * 插件初始化脚本
 * 用于加载和启用插件
 */

const path = require('path');
const { PluginManager } = require('./pluginSystem');

/**
 * 初始化插件
 * @param {PluginManager} pluginManager - 插件管理器实例
 * @param {string} pluginsDir - 插件目录路径
 */
const initPlugins = async (pluginManager, pluginsDir) => {
  try {
    // 加载插件目录中的所有插件
    await pluginManager.loadPluginsFromDirectory(pluginsDir);
    
    // 启用所有加载的插件
    const plugins = pluginManager.getAllPlugins();
    for (const [name, plugin] of plugins) {
      await pluginManager.enablePlugin(name);
    }
    
    console.log(`插件初始化完成，共加载 ${plugins.size} 个插件`);
  } catch (error) {
    console.error('插件初始化失败:', error);
  }
};

module.exports = {
  initPlugins
};