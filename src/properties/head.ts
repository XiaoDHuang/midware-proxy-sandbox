import { ISandbox } from '@satumjs/types';
import { satumMicroHeadAppendChildFactory } from '@satumjs/async-override';

export function getFakeHead(sandbox: ISandbox) {
  return new Proxy(document.head, {
    get(target: HTMLHeadElement, p: PropertyKey) {
      if (p === 'appendChild') return satumMicroHeadAppendChildFactory(sandbox.body);
      const value = target[p];
      return typeof value === 'function' ? value.bind(target) : value;
    },
  });
}
