/**
 * 插件系统
 * 允许动态扩展机器人功能
 */

const fs = require('fs');
const path = require('path');
const { BotEvent } = require('./eventBus');

class PluginInterface {
  /**
   * 构造函数
   * @param {string} name - 插件名称
   * @param {string} description - 插件描述
   */
  constructor(name, description = '') {
    this.name = name;
    this.description = description;
    this.enabled = true;
    // 插件可以定义自己的命令元数据
    this.commands = [];
  }

  /**
   * 初始化插件
   * @param {DIContainer} container - 依赖注入容器
   * @param {EventBus} eventBus - 事件总线
   */
  async initialize(container, eventBus) {
    this.container = container;
    this.eventBus = eventBus;
  }

  /**
   * 插件启动时调用
   */
  async onStart() {}

  /**
   * 插件停止时调用
   */
  async onStop() {}

  /**
   * 处理命令
   * @param {string} command - 命令
   * @param {Object} bot - 机器人实例
   * @param {Object} msg - 消息对象
   * @returns {boolean} 是否处理了命令
   */
  async onCommand(command, bot, msg) {
    return false;
  }

  /**
   * 处理消息
   * @param {Object} bot - 机器人实例
   * @param {Object} msg - 消息对象
   * @returns {boolean} 是否处理了消息
   */
  async onMessage(bot, msg) {
    return false;
  }

  /**
   * 处理回调查询
   * @param {Object} bot - 机器人实例
   * @param {Object} callbackQuery - 回调查询对象
   * @returns {boolean} 是否处理了回调查询
   */
  async onCallbackQuery(bot, callbackQuery) {
    return false;
  }
}

class PluginManager {
  /**
   * 构造函数
   * @param {DIContainer} container - 依赖注入容器
   * @param {EventBus} eventBus - 事件总线
   */
  constructor(container, eventBus) {
    this.container = container;
    this.eventBus = eventBus;
    this.plugins = new Map();
    this.enabledPlugins = new Set();
  }

  /**
   * 加载插件
   * @param {string} pluginPath - 插件路径
   * @returns {PluginInterface} 插件实例
   */
  async loadPlugin(pluginPath) {
    try {
      const PluginClass = require(pluginPath);
      const plugin = new PluginClass();
      
      await plugin.initialize(this.container, this.eventBus);
      this.plugins.set(plugin.name, plugin);
      
      console.log(`插件已加载: ${plugin.name}`);
      return plugin;
    } catch (error) {
      console.error(`加载插件失败 ${pluginPath}:`, error);
      throw error;
    }
  }

  /**
   * 启用插件
   * @param {string} pluginName - 插件名称
   */
  async enablePlugin(pluginName) {
    const plugin = this.plugins.get(pluginName);
    if (!plugin) {
      throw new Error(`插件不存在: ${pluginName}`);
    }

    plugin.enabled = true;
    this.enabledPlugins.add(pluginName);
    
    await plugin.onStart();
    console.log(`插件已启用: ${pluginName}`);
  }

  /**
   * 禁用插件
   * @param {string} pluginName - 插件名称
   */
  async disablePlugin(pluginName) {
    const plugin = this.plugins.get(pluginName);
    if (!plugin) {
      throw new Error(`插件不存在: ${pluginName}`);
    }

    plugin.enabled = false;
    this.enabledPlugins.delete(pluginName);
    
    await plugin.onStop();
    console.log(`插件已禁用: ${pluginName}`);
  }

  /**
   * 加载插件目录中的所有插件
   * @param {string} pluginsDir - 插件目录
   */
  async loadPluginsFromDirectory(pluginsDir) {
    if (!fs.existsSync(pluginsDir)) {
      console.log(`插件目录不存在: ${pluginsDir}`);
      return;
    }

    const files = fs.readdirSync(pluginsDir);
    for (const file of files) {
      if (file.endsWith('.js')) {
        const pluginPath = path.join(pluginsDir, file);
        await this.loadPlugin(pluginPath);
      }
    }
  }

  /**
   * 执行命令
   * @param {string} command - 命令
   * @param {Object} bot - 机器人实例
   * @param {Object} msg - 消息对象
   * @returns {boolean} 是否有插件处理了命令
   */
  async executeCommand(command, bot, msg) {
    for (const [name, plugin] of this.plugins) {
      if (plugin.enabled && this.enabledPlugins.has(name)) {
        try {
          const result = await plugin.onCommand(command, bot, msg);
          if (result) {
            // 发布命令执行事件，使用BotEvent常量
            await this.eventBus.emit(BotEvent.COMMAND_EXECUTED, {
              command,
              plugin: name,
              userId: msg.from?.id,
              chatId: msg.chat.id
            });
            return true;
          }
        } catch (error) {
          console.error(`插件 ${name} 处理命令时出错:`, error);
        }
      }
    }
    return false;
  }

  /**
   * 处理消息
   * @param {Object} bot - 机器人实例
   * @param {Object} msg - 消息对象
   * @returns {boolean} 是否有插件处理了消息
   */
  async handleMessage(bot, msg) {
    for (const [name, plugin] of this.plugins) {
      if (plugin.enabled && this.enabledPlugins.has(name)) {
        try {
          const result = await plugin.onMessage(bot, msg);
          if (result) {
            return true;
          }
        } catch (error) {
          console.error(`插件 ${name} 处理消息时出错:`, error);
        }
      }
    }
    return false;
  }

  /**
   * 处理回调查询
   * @param {Object} bot - 机器人实例
   * @param {Object} callbackQuery - 回调查询对象
   * @returns {boolean} 是否有插件处理了回调查询
   */
  async handleCallbackQuery(bot, callbackQuery) {
    for (const [name, plugin] of this.plugins) {
      if (plugin.enabled && this.enabledPlugins.has(name)) {
        try {
          const result = await plugin.onCallbackQuery(bot, callbackQuery);
          if (result) {
            return true;
          }
        } catch (error) {
          console.error(`插件 ${name} 处理回调查询时出错:`, error);
        }
      }
    }
    return false;
  }

  /**
   * 获取所有插件命令元数据
   * @returns {Array} 命令元数据数组
   */
  getPluginCommands() {
    const allCommands = [];
    
    for (const [name, plugin] of this.plugins) {
      if (plugin.enabled && this.enabledPlugins.has(name)) {
        allCommands.push(...plugin.commands);
      }
    }
    
    return allCommands;
  }

  /**
   * 获取所有插件
   * @returns {Map<string, PluginInterface>} 插件映射
   */
  getAllPlugins() {
    return this.plugins;
  }

  /**
   * 获取启用的插件
   * @returns {Set<string>} 启用的插件名称集合
   */
  getEnabledPlugins() {
    return this.enabledPlugins;
  }
  
  /**
   * 检查插件系统健康状况
   * @returns {boolean} 健康状态
   */
  isHealthy() {
    try {
      // 检查是否有加载的插件
      const allPlugins = this.getAllPlugins();
      const enabledPlugins = this.getEnabledPlugins();
      
      // 健康状况基于以下条件：
      // 1. 插件管理器已正确初始化（插件映射存在）
      // 2. 至少有一个插件被加载（即使未启用）
      // 3. 至少有一个插件被启用（系统可实际运行插件）
      const hasLoadedPlugins = allPlugins.size > 0;
      const hasEnabledPlugins = enabledPlugins.size > 0;
      
      // 如果没有任何插件被启用，可能意味着插件系统未正确配置
      if (!hasEnabledPlugins && hasLoadedPlugins) {
        console.warn('插件系统健康检查警告: 没有启用任何插件，但已加载插件');
        // 这种情况下，插件系统技术上是健康的（已加载插件），但功能上可能不完整
        // 根据业务需求，我们仍然认为系统是健康的，但有警告
      }
      
      // 如果没有任何插件被加载，插件系统可能未初始化
      if (!hasLoadedPlugins) {
        console.warn('插件系统健康检查警告: 没有加载任何插件');
        return false; // 没有插件加载意味着系统不健康
      }
      
      // 插件系统存在且至少加载了一些插件
      return hasLoadedPlugins;
    } catch (error) {
      console.error('插件系统健康检查失败:', error);
      return false;
    }
  }
}

module.exports = {
  PluginInterface,
  PluginManager
};