import { FakeDocument, FakeLocation, FakeWindow, ISandbox, KeyObject } from '@satumjs/types';
import { ProxySandboxOptions } from '../type';
import { getPureWindow } from './pureWin';
import { CtxEventDB } from './event';
import { bindFuncton } from './function';

export const getFakeWinBySandbox = (sandbox: ISandbox) => {
  return sandbox.vmContext as ISandbox['vmContext'];
}

export function getFakeWindow(
  sandbox: ISandbox,
  ctxWinEventDatabase: CtxEventDB,
  fakeDocument: FakeDocument,
  fakeLocation: FakeLocation,
  options: ProxySandboxOptions,
) {
  const proxyWin = Object.create(null);
  const pureWin = getPureWindow();
  
  const fakeWin: FakeWindow = new Proxy(proxyWin, {
    get(_: Window, k: PropertyKey) {
      if (['self', 'window', 'top', 'parent'].includes(k as string)) return fakeWin;
      if (k === 'document') return fakeDocument;
      if (k === 'location') return fakeLocation;

      // custom returns
      if (typeof options.winVariable === 'function') {
        const result = options.winVariable(k, proxyWin, window);
        if (result !== undefined && result !== null) return result;
      }

      const val = k in proxyWin ? proxyWin[k] : window[k];
      if (typeof k === 'string' && typeof val === 'function') {
        if (/^[A-Z]/.test(k)) return val;

        if (k === 'eval') return val;

        // 来自用户自定义全局属性， 绑定沙盒， 复制静态属性
        // window.func.staticName = 'name'的问题
        if (pureWin && !(k in pureWin) && (k in proxyWin))  return bindFuncton(val, proxyWin);
        
        if (k in window) return k.startsWith('on') ? val : val.bind(window);
      }
      return val;
    },
    set: (_: Window, k: PropertyKey, val: any) => {
      if (typeof k === 'string' && k in window && k.startsWith('on')) {
        ctxWinEventDatabase.push({ event: k, callback: val });
        window[k] = val;
      } else {
        if (sandbox.setVariable && typeof k === 'string') sandbox.setVariable(k, val);
        proxyWin[k] = val;
      }
      return true;
    },
    has(_: any, k: PropertyKey): boolean {
      // 来自用户自定义全局属性， 劫持到沙盒中
      if (pureWin && !(k in pureWin)) return true;

      return k in proxyWin || k in window;
    },
    deleteProperty(_: Window, k: PropertyKey) {
      delete proxyWin[k];
      delete window[k];
      return true;
    },
  });

  return fakeWin;
}
