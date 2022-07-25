/* prettier-ignore */ import {
  MidwareSystem, IMicroApp, MidwareName, NextFn, FileType, KeyObject, ISandbox, TSandboxConfig, SandboxGetCode,
  ModuleItem, fakeWrapTagName, fakeTagName,PluginEvent, FakeLocation, FakeDocument
} from '@satumjs/types';
import { isFullUrl, printLog, toArray } from '@satumjs/utils';
import { 
  getFakeDocument,
  getFakeDocumentElement, 
  getFakeHead, 
  getFakeBody, 
  getFakeLocation, 
  getFakeWindow, 
  handleWinEvent, 
  handleDocEvent, 
  handleHtmlEvent, 
  removeAllWinEvents, 
  CtxEventDB, 
  removeAllDocEvents, 
  removeAllHtmlEvents,
  getFakeWinBySandbox,
} from './properties';
import { satumMicroCreateElementFactory } from '@satumjs/async-override';
import { ProxySandboxOptions } from './type';
import {  } from './properties/window';
import { fontFaceMidware, shadowRootMidware} from './midware';
class ProxySandbox implements ISandbox {
  static microApps: IMicroApp[];
  static options: ProxySandboxOptions;

  readonly appName: TSandboxConfig['appName'];
  private readonly fakeWindowName: string;
  private readonly ctxWinEventDatabase: CtxEventDB;
  private readonly ctxDocEventDatabase: CtxEventDB;
  private readonly ctxHtmlEventDatabase: CtxEventDB;
  private _body: ISandbox['body'];
  private _appWrap: ISandbox['appWrap'];
  private _vmContext: ISandbox['vmContext'];
  actorId: TSandboxConfig['actorId'];

  constructor(config: TSandboxConfig) {
    const { appName, actorId, fakeWindowName } = config || {};

    this.appName = appName;
    this.actorId = actorId;
    this.ctxWinEventDatabase = [];
    this.ctxDocEventDatabase = [];
    this.ctxHtmlEventDatabase = [];
    this.fakeWindowName = fakeWindowName || `fakeWindow${Date.now()}`;

    handleWinEvent(this, this.ctxWinEventDatabase);
    handleDocEvent(this, this.ctxDocEventDatabase);
    handleHtmlEvent(this, this.ctxHtmlEventDatabase);

    const originMutationObserverObserve = MutationObserver.prototype.observe;
    MutationObserver.prototype.observe = function (...args: any[]) {
      if (args[0] instanceof Document) args[0] = document;
      return originMutationObserverObserve.apply(this, args);
    };
  }

  get body() {
    return this._body;
  }

  get appWrap() {
    return this._appWrap;
  }

  get vmContext() {
    if (this._vmContext) return this._vmContext;

    const options = ProxySandbox.options;
    const locationPropsValueMap: KeyObject<string> = {};

    const fackeDoc =  getFakeDocument(this.ctxDocEventDatabase, () => getFakeWinBySandbox(this), () => getFakeDocumentElement(this), () => getFakeHead(this), () => getFakeBody(this), options);
    const fakeLocation = getFakeLocation(locationPropsValueMap, options, () => getFakeWinBySandbox(this));
    const fakeWin = getFakeWindow(
      this,
      this.ctxWinEventDatabase,
      fackeDoc,
      fakeLocation,
      options,
    );

    window[this.fakeWindowName] = fakeWin;
    fakeWin['microRealWindow'] = window;
    fakeWin['DRIVE_BY_MICROF2E'] = true; // for @icatjs/micro
    fakeWin['DRIVE_BY_SATUMMICRO'] = true;

    this._vmContext = fakeWin;
    return fakeWin;
  }

  init() {
    if (!this._body) {
      const appBody = document.createElement(fakeTagName);
      const wrapper = document.createElement(fakeWrapTagName);
      appBody.appendChild(wrapper);
      this._body = appBody;
      this._appWrap = wrapper;
    }

    if (!this.vmContext['createElementOverrided']) {
      const app = ProxySandbox.microApps.find((item) => item.name === this.appName);
      if (app) {
        const ctxDocument = this.vmContext.document;
        const ctxCreateElement = document.createElement.bind(document);
        ctxDocument.createElement = (tagName: keyof HTMLElementTagNameMap, options: ElementCreationOptions) => {
          const el = satumMicroCreateElementFactory(app, ctxCreateElement, this.fakeWindowName)(tagName, options) as HTMLElement;
          el && Object.defineProperty(el, 'ownerDocument', {
            get:() => {
              return this.vmContext.document;
            }
          });

          return el;
        };
      }
      this.vmContext['createElementOverrided'] = true;
    }

    return Promise.resolve();
  }

  exec(getCode: SandboxGetCode, type?: FileType) {
    type = type || FileType.JS;

    return getCode().then((code) => {
      const codes = toArray(code);
      switch (type) {
        case FileType.HTML:
          const template = codes.map(({ source }) => source).join('\n');
          const wrapper = this.body.querySelector(fakeWrapTagName);
          if (wrapper) wrapper.innerHTML = template;
          break;
        case FileType.CSS:
          const embedStyles = (<any>window).embedStylesIntoTemplate;
          if (!embedStyles) {
            const wrapper = this.body.querySelector(fakeWrapTagName);
            codes.forEach(({ file, source }) => {
              if (!source) return;
              const style = document.createElement('style');
              if (isFullUrl(file)) style.setAttribute('data-url', file);
              if (typeof source === 'string') {
                const nodeStyleSheet = (style as any).styleSheet;
                this.body.insertBefore(style, wrapper);
                style.setAttribute('type', 'text/css');
                if (nodeStyleSheet) {
                  nodeStyleSheet.cssText = source;
                } else {
                  style.appendChild(document.createTextNode(source));
                }
              }
            });
          }
          break;
        case FileType.JS:
          codes.forEach(({ file, source, modules, isEntry }) => {
            if (!source) return;

            const script = document.createElement('script');
            const isModuleFile = modules ? modules.length !== 0 : false;
            if (isModuleFile) script.type = 'module';
            if (isEntry) script.setAttribute('data-role', 'entry');
            if (isFullUrl(file)) script.setAttribute('data-url', file);
            if (typeof source === 'string') {
              if (isModuleFile) {
                let realSource = source;
                (modules as ModuleItem[]).forEach(({ exp, splits, modulePath }) => {
                  splits[1] = modulePath || '';
                  realSource = realSource.replace(exp, splits.join('"'));
                });
                script.text = realSource;
              } else {
                script.text = `with(window['${this.fakeWindowName}']){\n${source}\n}`;
                script.text = `(function(window, self, globalThis){\n${script.text}\n}).bind(window['${this.fakeWindowName}'])(window['${this.fakeWindowName}'], window['${this.fakeWindowName}'], window['${this.fakeWindowName}']);`
              }
              this.body.appendChild(script);
            } else if (source['content']) {
              (source['content'] as Promise<string>).then((s) => {
                if (!s) return;
                script.text = `with(window['${this.fakeWindowName}']){\n${s}\n}`;
                script.text = `(function(window, self, globalThis){\n${script.text}\n}).bind(window['${this.fakeWindowName}'])(window['${this.fakeWindowName}'], window['${this.fakeWindowName}'], window['${this.fakeWindowName}']);`
                this.body.appendChild(script);
              });
            }
          });
          break;
      }
      return code;
    });
  }

  remove() {
    printLog('domRemove', `actor \`${this.actorId}\` will remove fakeBody from dom-tree`, this.body.parentNode);
    this.body.parentNode?.removeChild(this.body);
    return Promise.resolve();
  }
  destory() {
    return this.remove().then(() => {
      printLog('eventsRemove', `actor \`${this.actorId}\` will remove all events from window`);
      removeAllWinEvents(this.ctxWinEventDatabase);
      removeAllDocEvents(this.ctxDocEventDatabase );
      removeAllHtmlEvents(this.ctxHtmlEventDatabase);
    });
  }
}


export default function proxySandboxMidware(system: MidwareSystem, microApps: IMicroApp[], next: NextFn) {
  ProxySandbox.microApps = microApps;
  const {useSandBox = true} = ProxySandbox.options = system.options as ProxySandboxOptions;
  system.set(MidwareName.Sandbox, ProxySandbox);

  if(useSandBox) {
    system.use(fontFaceMidware);
    system.use(shadowRootMidware);
  }

  next();
}

