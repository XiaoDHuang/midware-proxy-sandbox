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

export function handleDocEvent(sandbox: ISandbox, ctxDocEventDatabase: CtxEventDB, ) {
  const vmContext = sandbox.vmContext;
  const originRemoveEventListener = document.removeEventListener.bind(document);
  vmContext.document.removeEventListener = (evt: string, callback: CtxEventFn, _useCapture?:boolean) => {
    // TODO 这里需要去优化
    const callbackProxy = callbackWeakMap.get(callback);

    const targetEventIndex = ctxDocEventDatabase.findIndex(
      ({ event: itemEvt, callback: itemCallback }) => itemEvt === evt && itemCallback === callbackProxy,
    );

    if (targetEventIndex !== -1) {
      const { event, callback, useCapture } = ctxDocEventDatabase.splice(targetEventIndex, 1) as any;
      originRemoveEventListener(event, callback, useCapture);
    }
  };

  const originAddEventListener = document.addEventListener.bind(document);
  vmContext.document.addEventListener = (evt: string, callback: CtxEventFn, useCapture?: boolean) => {
    const callbackProxy = proxyHander(callback)
    ctxDocEventDatabase.push({ event: evt, callback: callbackProxy, useCapture});
    callbackWeakMap.set(callback, callbackProxy);

    return originAddEventListener(evt, callbackProxy, useCapture);
  };
}

export function handleHtmlEvent(sandbox: ISandbox, ctxHtmlEventDatabase: CtxEventDB, ) {
  const documentElement = sandbox.vmContext.document.documentElement;
  const originRemoveEventListener = documentElement.removeEventListener;

  documentElement.removeEventListener = (evt: string, callback: CtxEventFn, _useCapture?:boolean) => {
    // TODO 这里需要去优化
    const callbackProxy = callbackWeakMap.get(callback);

    const targetEventIndex = ctxHtmlEventDatabase.findIndex(
      ({ event: itemEvt, callback: itemCallback }) => itemEvt === evt && itemCallback === callbackProxy,
    );

    if (targetEventIndex !== -1) {
      const { event, callback, useCapture } = ctxHtmlEventDatabase.splice(targetEventIndex, 1) as any;
      originRemoveEventListener(event, callback, useCapture);
    }
  };

  const originAddEventListener = documentElement.addEventListener;
  documentElement.addEventListener = (evt: string, callback: CtxEventFn, useCapture?: boolean) => {
    const callbackProxy = proxyHander(callback)
    ctxHtmlEventDatabase.push({ event: evt, callback: callbackProxy, useCapture});
    callbackWeakMap.set(callback, callbackProxy);

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

export function removeAllDocEvents(ctxDocEventDatabase: CtxEventDB) {
  ctxDocEventDatabase.forEach(({ event, callback, useCapture}) => {
    if (event in document && event.startsWith('on')) {
      document[event] = null;
    } else {
      document.removeEventListener(event, callback, useCapture);
    }
  });
  ctxDocEventDatabase.splice(0, ctxDocEventDatabase.length);
}


export function removeAllHtmlEvents(ctxHtmlEventDatabase: CtxEventDB) {
  ctxHtmlEventDatabase.forEach(({ event, callback, useCapture}) => {
    if (event in window && event.startsWith('on')) {
      document.documentElement[event] = null;
    } else {
      document.documentElement.removeEventListener(event, callback, useCapture);
    }
  });
  ctxHtmlEventDatabase.splice(0, ctxHtmlEventDatabase.length);
}
