export function bindFuncton(func:Function, context:any):Function {
  return new Proxy<Function>(func, {
    get(func, p) {
      const value = Reflect.get(func, p);
      if (typeof value === 'function') {
        return bindFuncton(value as Function, func);
      }

      return value;
    },
    set(func, p, val) {
      return Reflect.set(func, p, val);
    },
    apply(func, _, args) {
      return Reflect.apply(func, context, args);
    },
    construct(func, args) {
      return Reflect.construct(func, args);
    }
  })
}