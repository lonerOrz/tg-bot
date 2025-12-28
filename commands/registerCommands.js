/**
 * 自动命令注册模块
 * 扫描命令目录并自动注册到 Telegram Bot
 */

const fs = require('fs');
const path = require('path');

/**
 * 扫描命令目录并注册命令
 * @param {Object} bot - Telegram Bot 实例
 * @param {Object} pluginManager - 插件管理器实例（可选）
 * @returns {Promise<boolean>} - 注册是否成功
 */
const registerBotCommands = async (bot, pluginManager = null) => {
  try {
    // 命令目录路径
    const commandsDir = path.join(__dirname);
    const commandFiles = fs.readdirSync(commandsDir);
    
    // 需要排除的文件
    const excludeFiles = ['commands.js', 'commandHandler.js', 'registerCommands.js'];
    
    const botCommands = [];
    
    for (const file of commandFiles) {
      // 只处理 .js 文件且不在排除列表中
      if (file.endsWith('.js') && !excludeFiles.includes(file)) {
        const filePath = path.join(commandsDir, file);
        
        // 删除缓存以确保获取最新版本
        delete require.cache[require.resolve(filePath)];
        
        const commandModule = require(filePath);
        
        // 如果模块导出元数据，则使用元数据注册命令
        if (commandModule.commandMetadata) {
          botCommands.push(commandModule.commandMetadata);
        }
      }
    }
    
    // 如果提供了插件管理器，也添加插件的命令
    if (pluginManager) {
      const pluginCommands = pluginManager.getPluginCommands();
      botCommands.push(...pluginCommands);
    }
    
    // 获取当前已注册的命令
    const currentCommands = await bot.getMyCommands().catch(() => ({ commands: [] }));
    
    // 比较当前命令和需要注册的命令
    const currentCommandList = currentCommands.commands || [];
    
    // 检查是否需要更新
    const needUpdate = 
      currentCommandList.length !== botCommands.length || 
      !botCommands.every(cmd => 
        currentCommandList.some(currentCmd => 
          currentCmd.command === cmd.command && currentCmd.description === cmd.description
        )
      );
    
    if (!needUpdate) {
      console.log('命令列表已是最新，无需更新');
      return true;
    }
    
    // 注册命令到 Telegram
    if (botCommands.length > 0) {
      await bot.setMyCommands(botCommands);
      console.log(`成功注册 ${botCommands.length} 个命令:`, botCommands.map(c => c.command));
      return true;
    } else {
      console.log('没有找到可注册的命令');
      return false;
    }
  } catch (error) {
    console.error('注册命令时出错:', error);
    return false;
  }
};

module.exports = {
  registerBotCommands
};