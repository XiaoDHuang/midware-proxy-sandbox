import { FakeDocument, FnWithArgs, ISandbox } from '@satumjs/types';
import { ProxySandboxOptions } from '../type';
import { CtxEventDB } from './event';



export function getFakeDocument( 
  ctxDocEventDatabase: CtxEventDB,
  getFakeWin: () => ISandbox['vmContext'],
  getFakeDocumentElement: FnWithArgs<HTMLElement, []>,  
  getFakeHead: FnWithArgs<HTMLElement, []>, 
  getFakeBody: FnWithArgs<HTMLElement, []>,
  options: ProxySandboxOptions
) {

  let fakeDocumentElement: HTMLElement;
  let fakeHeadNode: HTMLElement;
  let fakeBodyNode: HTMLElement;
  let shadowRoot: ShadowRoot;
 

  const proxyDoc = Object.create(null);
  const docProxyKey = new Set([
    'getElementById',
    'getElementsByClassName',
    'getElementsByClassName',
    'getElementsByName',
    'querySelector',
    'querySelectorAll'
  ]);

  const docGetter =  (_: Document, k: string) => {
    const fakeWin = getFakeWin();
    
    if (k === 'head') {
      return fakeHeadNode || (fakeHeadNode = getFakeHead());
    }

    if (k === 'documentElement') {
      return fakeDocumentElement || (fakeDocumentElement = getFakeDocumentElement());
    }

    if (k === 'getElementsByTagName' || k === 'querySelector' || k === 'querySelectorAll') {
      const originFn = document[k].bind(document);
      const isReturnArray = k !== 'querySelector';
      return (selector: string) => {
        if (selector === 'html') {
          const curHtmlNode = fakeDocumentElement || (fakeDocumentElement = getFakeDocumentElement());
          return isReturnArray ? [curHtmlNode] : curHtmlNode;
        }
        if (selector === 'head') {
          const curHeadNode = fakeHeadNode || (fakeHeadNode = getFakeHead());
          return isReturnArray ? [curHeadNode] : curHeadNode;
        }
        return originFn(selector);
      };
    }

    if (k === 'body') {
      return fakeBodyNode || (fakeBodyNode = getFakeBody())
    }

    // custom returns
    if (typeof options.docVariable === 'function') {
      const result = options.docVariable(k, proxyDoc, document, fakeWin);
      if (result !== undefined && result !== null) return result;
    }

    const isProxyKey = k in proxyDoc;
    const val = isProxyKey ? proxyDoc[k] : document[k];
    return typeof val === 'function' ? val.bind(isProxyKey ? proxyDoc : document) : val;
  }

  const fakeDocument: FakeDocument = new Proxy(proxyDoc, {
    get:(_: Document, k: string)  => {
      const originFn = docGetter(_, k);
      shadowRoot = shadowRoot || proxyDoc.shadowRoot;

      if (shadowRoot instanceof ShadowRoot && docProxyKey.has(k) && shadowRoot[k]) {
        return (selector:string) => {
          if (selector === 'html' || selector === 'head') {
            return originFn(selector)
          }

          return shadowRoot[k](selector);
        }
      }

      return originFn;
    },
    set: (_: Document, k: PropertyKey, val: any) => {
      if (typeof k === 'string' && ['title'].includes(k)) {
        document[k] = val;
      } else if (typeof k === 'string' && k in document && k.startsWith('on')) {
        ctxDocEventDatabase.push({ event: k, callback: val });
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
