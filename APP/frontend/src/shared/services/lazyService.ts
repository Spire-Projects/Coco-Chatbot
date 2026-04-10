export function createLazyService<T extends object>(factory: () => T): T {
  let instance: T | undefined;

  const getInstance = (): T => {
    if (!instance) {
      instance = factory();
    }

    return instance;
  };

  return new Proxy({} as T, {
    get(_target, property, receiver) {
      const service = getInstance();
      const value = Reflect.get(service as object, property, receiver);

      return typeof value === 'function' ? value.bind(service) : value;
    },
    set(_target, property, value, receiver) {
      return Reflect.set(getInstance() as object, property, value, receiver);
    },
    has(_target, property) {
      return property in (getInstance() as object);
    },
    ownKeys() {
      return Reflect.ownKeys(getInstance() as object);
    },
    getOwnPropertyDescriptor(_target, property) {
      return Object.getOwnPropertyDescriptor(getInstance() as object, property);
    },
  });
}