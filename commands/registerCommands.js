/**
 * 自动命令注册模块
 * 扫描命令目录并自动注册到 Telegram Bot
 */

const fs = require('fs');
const path = require('path');

/**
 * 扫描命令目录并注册命令
 * @param {Object} bot - Telegram Bot 实例
 * @returns {Promise<boolean>} - 注册是否成功
 */
const registerBotCommands = async (bot) => {
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
        const commandModule = require(filePath);
        
        // 如果模块导出元数据，则使用元数据注册命令
        if (commandModule.commandMetadata) {
          botCommands.push(commandModule.commandMetadata);
        }
      }
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