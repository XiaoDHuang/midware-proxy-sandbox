import { FakeDocument, FnWithArgs, KeyObject } from '@satumjs/types';

function getFakeDocumentElement(fakeDocument: FakeDocument) {
  const htmlNode = document.body.parentNode as HTMLElement;
  return new Proxy(htmlNode, {
    get(target: any, p: string) {
      if (p === 'parentNode') return fakeDocument;
      return typeof target[p] === 'function' ? target[p].bind(htmlNode) : target[p];
    },
  });
}

export function getFakeDocument(getFakeHead: FnWithArgs<HTMLElement, []>, options: KeyObject<any>) {
  let fakeDocumentElement: HTMLElement;
  let fakeHeadNode: HTMLElement;
  const proxyDoc = Object.create(null);

  const fakeDocument: FakeDocument = new Proxy(proxyDoc, {
    get: (_: Document, k: string) => {
      // fake head
      if (k === 'head') {
        return fakeHeadNode || (fakeHeadNode = getFakeHead());
      }

      if (k === 'documentElement') {
        return fakeDocumentElement || (fakeDocumentElement = getFakeDocumentElement(fakeDocument));
      }

      if (k === 'getElementsByTagName' || k === 'querySelector' || k === 'querySelectorAll') {
        const originFn = document[k].bind(document);
        const isReturnArray = k !== 'querySelector';
        return (selector: string) => {
          if (selector === 'html') {
            const curHtmlNode = fakeDocumentElement || (fakeDocumentElement = getFakeDocumentElement(fakeDocument));
            return isReturnArray ? [curHtmlNode] : curHtmlNode;
          }
          if (selector === 'head') {
            const curHeadNode = fakeHeadNode || (fakeHeadNode = getFakeHead());
            return isReturnArray ? [curHeadNode] : curHeadNode;
          }
          return originFn(selector);
        };
      }

      // custom returns
      if (typeof options.docVariable === 'function') {
        const result = options.docVariable(k, proxyDoc, document);
        if (result !== undefined && result !== null) return result;
      }

      const isProxyKey = k in proxyDoc;
      const val = isProxyKey ? proxyDoc[k] : document[k];
      return typeof val === 'function' ? val.bind(isProxyKey ? proxyDoc : document) : val;
    },
    set: (_: Document, k: PropertyKey, val: any) => {
      if (typeof k === 'string' && ['title'].includes(k)) {
        document[k] = val;
      } else {
        proxyDoc[k] = val;
      }
      return true;
    },
    has(_: any, k: PropertyKey): boolean {
      return k in proxyDoc || k in document;
    },
    deleteProperty(_: Document, k: PropertyKey) {
      delete proxyDoc[k];
      delete document[k];
      return true;
    },
    getPrototypeOf() {
      return Document.prototype;
    },
  });

  return fakeDocument;
}
