/**
 * 健康检查API端点
 * 提供系统各组件的健康状况
 */

const { healthCheck } = require("../utils/healthCheck");
const { BotEvent } = require("../utils/eventBus");
const config = require("../config");
const container = require("../utils/container");

// 注册健康检查
healthCheck.register('config', async () => {
  return !!config.telegramToken;
});

healthCheck.register('eventBus', async () => {
  // 简单检查事件总线是否正常
  return typeof BotEvent !== 'undefined';
});

healthCheck.register('api', async () => {
  // API端点本身是健康的
  return true;
});

// 添加插件系统健康检查
healthCheck.register('pluginSystem', async () => {
  try {
    // 从共享容器获取插件管理器
    const pluginManager = container.resolve('pluginManager');
    if (!pluginManager) {
      return false;
    }
    
    return pluginManager.isHealthy();
  } catch (error) {
    console.error('插件系统健康检查失败:', error);
    return false;
  }
});

module.exports = async (request, response) => {
  try {
    const result = await healthCheck.getSummary();
    
    response.status(200).json({
      status: 'ok',
      ...result,
      uptime: process.uptime()
    });
  } catch (error) {
    response.status(500).json({
      status: 'error',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
};