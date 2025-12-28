/**
 * 健康检查工具
 * 检查系统各组件和容器服务的运行状态
 */

class HealthCheck {
  constructor() {
    this.checks = new Map();
    // 预定义常用的容器检查方法
    this.defaultChecks = {
      // HTTP服务检查
      http: (url, timeout = 5000) => this.createHttpCheck(url, timeout),
      // TCP端口检查
      tcp: (host, port, timeout = 5000) => this.createTcpCheck(host, port, timeout),
      // 响应内容检查
      response: (url, expectedStatus = 200, timeout = 5000) => 
        this.createResponseCheck(url, expectedStatus, timeout)
    };
  }

  /**
   * 创建HTTP健康检查
   * @param {string} url - 要检查的URL
   * @param {number} timeout - 超时时间(毫秒)
   * @returns {Function} 检查函数
   */
  createHttpCheck(url, timeout = 5000) {
    return async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const response = await fetch(url, {
          method: 'GET',
          signal: controller.signal,
          headers: {
            'Accept': 'application/json,text/plain,*/*'
          }
        });
        
        clearTimeout(timeoutId);
        return response.ok;
      } catch (error) {
        return false;
      }
    };
  }

  /**
   * 创建TCP端口连通性检查
   * @param {string} host - 主机地址
   * @param {number} port - 端口号
   * @param {number} timeout - 超时时间(毫秒)
   * @returns {Function} 检查函数
   */
  createTcpCheck(host, port, timeout = 5000) {
    return async () => {
      const net = require('net');
      return new Promise((resolve) => {
        const socket = new net.Socket();
        let resolved = false;

        const cleanup = () => {
          socket.destroy();
          if (timer) clearTimeout(timer);
        };

        const timer = setTimeout(() => {
          if (!resolved) {
            resolved = true;
            cleanup();
            resolve(false);
          }
        }, timeout);

        socket.once('error', () => {
          if (!resolved) {
            resolved = true;
            cleanup();
            resolve(false);
          }
        });

        socket.once('connect', () => {
          if (!resolved) {
            resolved = true;
            cleanup();
            resolve(true);
          }
        });

        socket.connect(port, host);
      });
    };
  }

  /**
   * 创建响应内容检查
   * @param {string} url - 要检查的URL
   * @param {number} expectedStatus - 期望的状态码
   * @param {number} timeout - 超时时间(毫秒)
   * @returns {Function} 检查函数
   */
  createResponseCheck(url, expectedStatus = 200, timeout = 5000) {
    return async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const response = await fetch(url, {
          method: 'GET',
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        return response.status === expectedStatus;
      } catch (error) {
        return false;
      }
    };
  }

  /**
   * 注册健康检查
   * @param {string} name - 检查名称
   * @param {Function} checkFn - 检查函数，返回Promise<boolean>
   */
  register(name, checkFn) {
    this.checks.set(name, checkFn);
  }

  /**
   * 执行所有健康检查
   * @returns {Object} 检查结果
   */
  async checkAll() {
    const results = {};
    let isHealthy = true;

    for (const [name, checkFn] of this.checks) {
      try {
        const checkResult = await checkFn();
        results[name] = {
          status: checkResult ? 'healthy' : 'unhealthy',
          timestamp: new Date().toISOString()
        };
        
        if (!checkResult) {
          isHealthy = false;
        }
      } catch (error) {
        results[name] = {
          status: 'error',
          error: error.message,
          timestamp: new Date().toISOString()
        };
        isHealthy = false;
      }
    }

    return {
      status: isHealthy ? 'healthy' : 'unhealthy',
      checks: results,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 获取健康检查摘要
   * @returns {Object} 摘要信息
   */
  async getSummary() {
    const result = await this.checkAll();
    const healthyCount = Object.values(result.checks).filter(c => c.status === 'healthy').length;
    const totalCount = Object.keys(result.checks).length;
    
    return {
      status: result.status,
      healthy: healthyCount,
      total: totalCount,
      unhealthy: totalCount - healthyCount,
      timestamp: result.timestamp
    };
  }
}

// 创建全局健康检查实例
const healthCheck = new HealthCheck();

module.exports = {
  HealthCheck,
  healthCheck
};