/* prettier-ignore */ import {
  MidwareSystem, IMicroApp, MidwareName, NextFn, FileType, KeyObject, ISandbox, TSandboxConfig, SandboxGetCode,
  FakeWindow, fakeWrapTagName, fakeTagName,
} from '@satumjs/types';
import { printLog } from '@satumjs/utils';

class ProxySandbox implements ISandbox {
  static microApps: IMicroApp[];
  static options: KeyObject<any>;

  readonly appName: TSandboxConfig['appName'];
  private readonly fakeWindowName: string;
  private _body: ISandbox['body'];
  private _vmContext: ISandbox['vmContext'];
  actorId: TSandboxConfig['actorId'];

  constructor(config: TSandboxConfig) {
    const { appName, actorId, fakeWindowName } = config || {};

    this.appName = appName;
    this.actorId = actorId;
    this.fakeWindowName = fakeWindowName || `fakeWindow${Date.now()}`;
  }

  get body() {
    return this._body;
  }

  get vmContext() {
    if (this._vmContext) return this._vmContext;

    const proxyWin = Object.create(null);
    const fakeWin: FakeWindow = new Proxy(proxyWin, {});

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
    return Promise.resolve();
  }

  exec(getCode: SandboxGetCode, type?: FileType) {
    type = type || FileType.JS;
    return getCode().then((code) => {
      return code;
    });
  }

  remove() {
    printLog(`actor \`${this.actorId}\` will remove fakeBody from dom-tree`);
    this.body.parentNode?.removeChild(this.body);
    return Promise.resolve();
  }
  destory() {
    return this.remove().then(() => {
      printLog(`actor \`${this.actorId}\` will remove all events from window`);
    });
  }
}

export default function proxySandboxMidware(system: MidwareSystem, microApps: IMicroApp[], next: NextFn) {
  ProxySandbox.microApps = microApps;
  ProxySandbox.options = system.options;
  system.set(MidwareName.Sandbox, ProxySandbox);
  next();
}
