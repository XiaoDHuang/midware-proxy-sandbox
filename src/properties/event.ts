import { ISandbox, FnWithArgs } from '@satumjs/types';

type CtxEventFn = FnWithArgs<any, any>;

const callbackWeakMap = new WeakMap<any, any>();
const proxyHander = (callback: CtxEventFn) => {
  const callbackProxy = (event:MouseEvent) => {
    let mouseEvent = event;
    if (event instanceof MouseEvent) {
      mouseEvent = new Proxy(Object.create(null), {
        get(_obj, p) {
          if (p === 'target') {
            return ((event as any).path || event.composedPath())[0] || null;
          }
    
          const value = Reflect.get(event, p);
    
          if (typeof value === 'function') {
            return value.bind(event);
          }
    
          return value;
        }
      });
    }

    return callback(mouseEvent);
  }

  return callbackProxy;
}

export type CtxEventDB = { event: string; callback: CtxEventFn, useCapture?: boolean }[];

export function handleWinEvent(sandbox: ISandbox, ctxWinEventDatabase: CtxEventDB) {
  const vmContext = sandbox.vmContext;
  const originRemoveEventListener = window.removeEventListener.bind(window);
  vmContext.removeEventListener = (evt: string, callback: CtxEventFn) => {
    const callbackProxy = callbackWeakMap.get(callback);

    const targetEventIndex = ctxWinEventDatabase.findIndex(
      ({ event: itemEvt, callback: itemCallback }) => itemEvt === evt && itemCallback === callbackProxy,
    );
    if (targetEventIndex !== -1) ctxWinEventDatabase.splice(targetEventIndex, 1);
    originRemoveEventListener(evt, callbackProxy);
  };

  const originAddEventListener = window.addEventListener.bind(window);
  vmContext.addEventListener = (evt: string, callback: CtxEventFn, useCapture?: boolean) => {
    const callbackProxy = proxyHander(callback)
    callbackWeakMap.set(callback, callbackProxy);
    ctxWinEventDatabase.push({ event: evt, callback: callbackProxy });
    return originAddEventListener(evt, callbackProxy, useCapture);
  };
}

export function removeAllWinEvents(ctxWinEventDatabase: CtxEventDB) {
  ctxWinEventDatabase.forEach(({ event, callback }) => {
    if (event in window && event.startsWith('on')) {
      window[event] = null;
    } else {
      window.removeEventListener(event, callback);
    }
  });
  ctxWinEventDatabase.splice(0, ctxWinEventDatabase.length);
}