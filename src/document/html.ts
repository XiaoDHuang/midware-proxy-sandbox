
import { FakeDocument, ISandbox } from '@satumjs/types';

export function getFakeDocumentElement(sandbox: ISandbox) {
  const htmlNode = document.documentElement;
  let fakeDocument:FakeDocument|null = null;

  const htmlProxy = Object.create(null);
  const keys = ['addEventListener', 'removeEventListener'];

  return new Proxy(htmlProxy, {
    get(target: any, p: string) {
      if (p === 'parentNode') return fakeDocument || (fakeDocument = sandbox.vmContext.document);
      if (p === 'ownerDocument') return fakeDocument || (fakeDocument = sandbox.vmContext.document);

      
      if(target[p] !== void 0) {
        return target[p];
      }

      if (htmlNode[p] && typeof htmlNode[p] === 'function') {
        return htmlNode[p].bind(htmlNode);
      }

      return htmlNode[p];
    },
    set(target:any, p:string, value) {
      if (keys.includes(p)) {
        return Reflect.set(target, p, value);
      }

      return Reflect.set(htmlNode, p, value);
    }
  });
}