/* prettier-ignore */ import {
  MidwareSystem, IMicroApp, MidwareName, NextFn, FileType, KeyObject, ISandbox, TSandboxConfig, SandboxGetCode,
  ModuleItem, fakeWrapTagName, fakeTagName,
} from '@satumjs/types';
import { isFullUrl, printLog, toArray } from '@satumjs/utils';
import { getFakeDocument, getFakeHead, getFakeLocation, getFakeWindow, handleWinEvent, removeAllWinEvents, CtxEventDB } from './properties';
import { satumMicroCreateElementFactory } from '@satumjs/async-override';

class ProxySandbox implements ISandbox {
  static microApps: IMicroApp[];
  static options: KeyObject<any>;

  readonly appName: TSandboxConfig['appName'];
  private readonly fakeWindowName: string;
  private readonly ctxWinEventDatabase: CtxEventDB;
  private _body: ISandbox['body'];
  private _vmContext: ISandbox['vmContext'];
  actorId: TSandboxConfig['actorId'];

  constructor(config: TSandboxConfig) {
    const { appName, actorId, fakeWindowName } = config || {};

    this.appName = appName;
    this.actorId = actorId;
    this.ctxWinEventDatabase = [];
    this.fakeWindowName = fakeWindowName || `fakeWindow${Date.now()}`;

    handleWinEvent(this, this.ctxWinEventDatabase);

    const originMutationObserverObserve = MutationObserver.prototype.observe;
    MutationObserver.prototype.observe = function (...args: any[]) {
      if (args[0] instanceof Document) args[0] = document;
      return originMutationObserverObserve.apply(this, args);
    };
  }

  get body() {
    return this._body;
  }

  get vmContext() {
    if (this._vmContext) return this._vmContext;

    const options = ProxySandbox.options;
    const locationPropsValueMap: KeyObject<string> = {};
    const fakeWin = getFakeWindow(
      this,
      this.ctxWinEventDatabase,
      getFakeDocument(() => getFakeHead(this), options),
      getFakeLocation(locationPropsValueMap),
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
    }

    if (!this.vmContext['createElementOverrided']) {
      const app = ProxySandbox.microApps.find((item) => item.name === this.appName);
      if (app) {
        const ctxDocument = this.vmContext.document;
        const ctxCreateElement = document.createElement.bind(document);
        ctxDocument.createElement = (tagName: keyof HTMLElementTagNameMap, options: ElementCreationOptions) => {
          return satumMicroCreateElementFactory(app, ctxCreateElement, this.fakeWindowName)(tagName, options) as HTMLElement;
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
              }
              this.body.appendChild(script);
            } else if (source['content']) {
              (source['content'] as Promise<string>).then((s) => {
                if (!s) return;
                script.text = `with(window['${this.fakeWindowName}']){\n${s}\n}`;
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
    });
  }
}

export default function proxySandboxMidware(system: MidwareSystem, microApps: IMicroApp[], next: NextFn) {
  ProxySandbox.microApps = microApps;
  ProxySandbox.options = system.options;
  system.set(MidwareName.Sandbox, ProxySandbox);
  next();
}
