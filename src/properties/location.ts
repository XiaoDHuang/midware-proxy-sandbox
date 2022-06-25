import { FakeLocation, KeyObject } from '@satumjs/types';

export function getFakeLocation(propsValueMap: KeyObject<string>) {
  const props = ['pathname', 'hash'];
  // fix: use `{}` for 'get' on proxy: property 'assign' is a read-only and non-configurable data property
  // on the proxy target but the proxy did not return its actual value
  return new Proxy({} as Location, {
    get(_: Location, p: PropertyKey) {
      const target = location;
      const value = typeof p === 'string' && props.includes(p) ? propsValueMap[p] || target[p] : target[p];
      return typeof value === 'function' ? value.bind(target) : value;
    },
    set(_: Location, p: PropertyKey, val: any) {
      const target = location;
      typeof p === 'string' && props.includes(p) ? (propsValueMap[p] = val) : (target[p] = val);
      return true;
    },
    has(_: Location, p: PropertyKey): boolean {
      return p in location || p in propsValueMap;
    },
    deleteProperty(_: Location, p: PropertyKey) {
      delete location[p];
      delete propsValueMap[p as string];
      return true;
    },
  }) as FakeLocation;
}
