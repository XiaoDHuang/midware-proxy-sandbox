import { ISandbox, FnWithArgs } from '@satumjs/types';

type CtxEventFn = FnWithArgs<any, any>;
export type CtxEventDB = { event: string; callback: CtxEventFn }[];

export function handleWinEvent(sandbox: ISandbox, ctxWinEventDatabase: CtxEventDB) {
  const vmContext = sandbox.vmContext;
  const originRemoveEventListener = window.removeEventListener.bind(window);
  vmContext.removeEventListener = (evt: string, callback: CtxEventFn) => {
    const targetEventIndex = ctxWinEventDatabase.findIndex(
      ({ event: itemEvt, callback: itemCallback }) => itemEvt === evt && itemCallback === callback,
    );
    if (targetEventIndex !== -1) ctxWinEventDatabase.splice(targetEventIndex, 1);
    originRemoveEventListener(evt, callback);
  };

  const originAddEventListener = window.addEventListener.bind(window);
  vmContext.addEventListener = (evt: string, callback: CtxEventFn, useCapture?: boolean) => {
    ctxWinEventDatabase.push({ event: evt, callback });
    return originAddEventListener(evt, callback, useCapture);
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
