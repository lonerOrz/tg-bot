/**
 * 共享依赖注入容器
 * 用于在不同模块间共享服务实例，避免循环依赖
 */

const DIContainer = require('./diContainer');

// 创建全局单例容器
const container = new DIContainer();

module.exports = container;