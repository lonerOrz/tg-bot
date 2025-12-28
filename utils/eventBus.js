/**
 * 事件总线系统
 * 实现事件驱动架构
 */

class EventBus {
  constructor() {
    this.listeners = new Map();
  }

  /**
   * 订阅事件
   * @param {string} eventType - 事件类型
   * @param {Function} handler - 事件处理器
   * @param {Object} context - 处理器上下文
   */
  subscribe(eventType, handler, context = null) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, []);
    }
    
    this.listeners.get(eventType).push({ handler, context });
  }

  /**
   * 取消订阅事件
   * @param {string} eventType - 事件类型
   * @param {Function} handler - 事件处理器
   */
  unsubscribe(eventType, handler) {
    if (this.listeners.has(eventType)) {
      const handlers = this.listeners.get(eventType);
      const index = handlers.findIndex(item => item.handler === handler);
      if (index !== -1) {
        handlers.splice(index, 1);
      }
    }
  }

  /**
   * 发布事件
   * @param {string} eventType - 事件类型
   * @param {any} data - 事件数据
   * @returns {Promise<Array>} 处理器返回值的数组
   */
  async emit(eventType, data = null) {
    if (!this.listeners.has(eventType)) {
      return [];
    }

    const handlers = this.listeners.get(eventType);
    const results = [];

    // 并行执行所有处理器，但捕获每个处理器的错误，确保一个处理器的错误不会影响其他处理器
    const handlerPromises = handlers.map(async ({ handler, context }) => {
      try {
        const result = context 
          ? await handler.call(context, data) 
          : await handler(data);
        return { status: 'fulfilled', value: result };
      } catch (error) {
        console.error(`Error in event handler for ${eventType}:`, error);
        return { status: 'rejected', reason: error };
      }
    });

    const settledResults = await Promise.allSettled(handlerPromises);

    // 提取结果值，保持一致性
    for (const result of settledResults) {
      if (result.status === 'fulfilled') {
        results.push(result.value);
      } else {
        // 对于失败的处理器，仍然添加到结果中，但不中断事件流
        results.push(null);
      }
    }

    return results;
  }

  /**
   * 获取事件处理器数量
   * @param {string} eventType - 事件类型
   * @returns {number}
   */
  listenerCount(eventType) {
    return this.listeners.has(eventType) 
      ? this.listeners.get(eventType).length 
      : 0;
  }
}

// 定义机器人事件类型
const BotEvent = {
  MESSAGE_RECEIVED: 'message.received',
  COMMAND_EXECUTED: 'command.executed',
  PERMISSION_CHECKED: 'permission.checked',
  VERIFICATION_STARTED: 'verification.started',
  VERIFICATION_COMPLETED: 'verification.completed',
  ERROR_OCCURRED: 'error.occurred',
};

module.exports = {
  EventBus,
  BotEvent
};