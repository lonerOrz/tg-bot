/**
 * 依赖注入容器
 * 管理所有服务的生命周期和依赖关系
 */

class DIContainer {
  constructor() {
    this.services = new Map();
    this.singletons = new Map();
    this.resolvedInstances = new Map();
  }

  /**
   * 注册服务
   * @param {string} name - 服务名称
   * @param {Function} factory - 工厂函数，接收容器作为参数
   * @param {boolean} isSingleton - 是否为单例
   */
  register(name, factory, isSingleton = false) {
    if (isSingleton) {
      this.singletons.set(name, { factory, instance: null });
    } else {
      this.services.set(name, factory);
    }
  }

  /**
   * 解析并获取服务实例
   * @param {string} name - 服务名称
   * @returns {any} 服务实例
   */
  resolve(name) {
    // 检查是否已解析过单例
    if (this.singletons.has(name)) {
      const singleton = this.singletons.get(name);
      if (!singleton.instance) {
        singleton.instance = singleton.factory(this);
      }
      return singleton.instance;
    }

    // 普通服务每次返回新实例
    const factory = this.services.get(name);
    if (factory) {
      return factory(this);
    }

    throw new Error(`Service ${name} not found. Available services: [${Array.from(this.services.keys()).concat(Array.from(this.singletons.keys())).join(', ')}]`);
  }

  /**
   * 检查服务是否存在
   * @param {string} name - 服务名称
   * @returns {boolean}
   */
  has(name) {
    return this.services.has(name) || this.singletons.has(name);
  }

  /**
   * 注册多个服务
   * @param {Object} services - 服务配置对象
   */
  registerMultiple(services) {
    for (const [name, config] of Object.entries(services)) {
      const { factory, singleton = false } = typeof config === 'function' 
        ? { factory: config, singleton: false } 
        : config;
      
      this.register(name, factory, singleton);
    }
  }
}

module.exports = DIContainer;