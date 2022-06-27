jest.mock('@satumjs/async-override');
import { FileType } from '@satumjs/types';
import { satumMicroCreateElementFactory } from '@satumjs/async-override';
import proxySandboxMidware from '.';
import { getFakeWindow, getFakeDocument } from './properties';
jest.mock('./properties');

describe('@satumjs/midware-proxy-sandbox test', () => {
  let Sandbox: any;
  beforeEach(() => {
    const fakeSystem = { options: {}, set: jest.fn() } as any;
    const microApps: any[] = [{ name: 'foo' }, { name: 'bar' }];
    const next = jest.fn();
    proxySandboxMidware(fakeSystem, microApps, next);
    expect(fakeSystem.set).toBeCalled();
    Sandbox = fakeSystem.set.mock.calls[0][1];
    (getFakeWindow as any).mockReturnValue({} as any);
  });

  test('new Sandbox', () => {
    const dateSpy = jest.spyOn(Date, 'now').mockImplementation(() => 1234);
    const sandbox = new Sandbox();
    expect('appName' in sandbox).toBe(true);
    expect(sandbox.appName).toBe(undefined);
    expect(sandbox.actorId).toBe(undefined);
    expect(sandbox.fakeWindowName).toBe('fakeWindow1234');
    expect(sandbox.body).toBeUndefined();

    const proxyDoc = new Proxy(Object.create(Document.prototype), {}) as any;
    const watcher = new MutationObserver(jest.fn);
    watcher.observe(proxyDoc, { attributes: true });

    expect(sandbox.vmContext === window[sandbox.fakeWindowName]).toBe(true);
    expect(sandbox.vmContext['DRIVE_BY_SATUMMICRO']).toBe(true);
    (getFakeDocument as any).mock.calls[0][0]();
    dateSpy.mockRestore();
  });

  test('init/destory', () => {
    const sandbox = new Sandbox({ appName: 'foo', actorId: 'foo' });
    const appBody = { appendChild: jest.fn() } as any;
    const wrapper = {} as any;
    const createElement = jest.fn();
    const fakeDoc = { createElement };
    const spyDoc = jest.spyOn(window, 'document', 'get').mockImplementation(() => fakeDoc as any);

    sandbox.vmContext.document = fakeDoc;
    (satumMicroCreateElementFactory as any).mockReturnValue(createElement);
    createElement.mockReturnValueOnce(appBody).mockReturnValueOnce(wrapper);
    sandbox.init().then(() => {
      expect(sandbox.body).toEqual(appBody);
      expect(createElement).toBeCalledTimes(2);

      sandbox.vmContext.document.createElement();
      expect(satumMicroCreateElementFactory).toBeCalled();

      appBody.parentNode = null;
      sandbox.destory().then(() => {
        appBody.parentNode = { removeChild: jest.fn() };
        sandbox.destory().then(() => expect(appBody.parentNode?.removeChild).toHaveBeenCalled());
      });
      spyDoc.mockRestore();
    });
  });

  test('exec simply', () => {
    const sandbox = new Sandbox({ appName: 'foo', actorId: 'foo' });
    (<any>window).embedStylesIntoTemplate = true;
    sandbox.exec(jest.fn().mockResolvedValue('aaa'), FileType.CSS).then((res: any) => expect(res).toBe('aaa'));
    sandbox.exec(jest.fn().mockResolvedValue(''));
  });
});

describe('@satumjs/midware-proxy-sandbox runScript test', () => {
  let sandbox: any;
  let fakeDoc: any;
  let appBody: HTMLElement;
  let wrapper: HTMLElement;
  let childNode: HTMLElement;
  beforeEach(() => {
    const fakeSystem = { options: {}, set: jest.fn() } as any;
    const microApps: any[] = [{ name: 'foo' }, { name: 'bar' }];
    const next = jest.fn();
    proxySandboxMidware(fakeSystem, microApps, next);
    expect(fakeSystem.set).toBeCalled();

    const Sandbox = fakeSystem.set.mock.calls[0][1];
    sandbox = new Sandbox({ appName: 'foo', actorId: 'foo', fakeWindowName: 'foo' });
    (getFakeWindow as any).mockReturnValue({} as any);

    fakeDoc = { createElement: jest.fn(), createTextNode: jest.fn() } as any;
    wrapper = {} as HTMLElement;
    appBody = {
      querySelector: jest.fn() as any,
      appendChild: jest.fn() as any,
      parentNode: { removeChild: jest.fn() as any },
      insertBefore: jest.fn() as any,
      setAttribute: jest.fn() as any,
    } as HTMLElement;
    sandbox._body = appBody;
    childNode = { setAttribute: jest.fn() as any } as HTMLElement;
  });

  test('runScript html', (done) => {
    (appBody.querySelector as any).mockReturnValue(wrapper);
    const getHtmlCodes = () => Promise.resolve([{ source: 'aaa' }, { source: 'bbb' }]);
    sandbox.exec(getHtmlCodes as any, FileType.HTML).then(() => {
      expect(appBody.querySelector).toHaveBeenCalled();
      expect(wrapper.innerHTML).toBe('aaa\nbbb');
      done();
    });
  });

  test('runScript css', (done) => {
    const spy = jest.spyOn(window, 'document', 'get');
    (<any>window).embedStylesIntoTemplate = true;
    const getCssCode1 = () => Promise.resolve({});
    sandbox.exec(getCssCode1 as any, FileType.CSS).then(() => {
      expect(appBody.querySelector).toBeCalledTimes(0);

      (appBody.querySelector as any).mockReturnValueOnce(wrapper);
      const styleNode = { appendChild: jest.fn(), setAttribute: jest.fn() } as any;
      fakeDoc.createElement.mockReturnValueOnce(styleNode);
      fakeDoc.createTextNode.mockReturnValueOnce(childNode);
      spy.mockImplementation(() => fakeDoc);
      (<any>window).embedStylesIntoTemplate = false;

      const fakeCssFile = { file: '//www.bat.com/aaa.css', source: 'body{font-size:12px}' };
      const getCssCode2 = () => Promise.resolve([fakeCssFile, {}]);
      sandbox.exec(getCssCode2 as any, FileType.CSS).then(() => {
        expect(appBody.querySelector).toBeCalledTimes(1);
        expect(fakeDoc.createElement).toBeCalledTimes(1);
        expect(styleNode.setAttribute).toBeCalledWith('data-url', fakeCssFile.file);
        expect(fakeDoc.createTextNode).toBeCalled();
        expect(fakeDoc.createTextNode.mock.calls[0][0]).toBe(fakeCssFile.source);

        styleNode.styleSheet = {} as any;
        fakeDoc.createElement.mockReturnValueOnce(styleNode);
        (appBody.querySelector as any).mockReturnValueOnce(wrapper);
        sandbox.exec(getCssCode2 as any, FileType.CSS).then(() => {
          expect(styleNode.styleSheet.cssText).toBe(fakeCssFile.source);
          spy.mockRestore();
          done();
        });
      });
    });
  });

  test('runScript js', (done) => {
    const spy = jest.spyOn(window, 'document', 'get');
    fakeDoc.createElement.mockReturnValueOnce(childNode);
    spy.mockImplementation(() => fakeDoc);
    const getJSCode = () => Promise.resolve([{ file: '//www.bat.com/aaa.js', source: 'aaa', isEntry: true }, {}]);
    sandbox.exec(getJSCode as any).then(() => {
      expect(fakeDoc.createElement).toBeCalledTimes(1);
      expect(childNode.setAttribute).toBeCalledTimes(2);
      expect((childNode as any).text).toBe("with(window['foo']){\naaa\n}");

      // next to syncFile
      fakeDoc.createElement.mockReturnValueOnce(childNode);
      const syncFile = { source: { content: Promise.resolve('bbb') } };
      const syncFile2 = { source: { content: Promise.resolve() } };
      sandbox.exec((() => Promise.resolve([syncFile, syncFile2])) as any).then(() => {
        expect((childNode as any).text).toBe("with(window['foo']){\nbbb\n}");
        spy.mockRestore();
        done();
      });
    });
  });

  test('runScript module-js', (done) => {
    const spy = jest.spyOn(window, 'document', 'get');
    const source = 'import { foo, bar } from "./aaa.js"';
    fakeDoc.createElement.mockReturnValueOnce(childNode).mockReturnValueOnce(childNode);
    spy.mockImplementation(() => fakeDoc);

    const getJSCode = () =>
      Promise.resolve([
        { file: '//foo.js', source: 'foo', modules: [{ exp: 'xxx', splits: [''] }] },
        {
          file: '//www.bat.com/bbb.js',
          source,
          modules: [{ exp: source, splits: ['import { foo, bar } from ', './aaa.js', ''], modulePath: '//foo.html/assets/./aaa.js' }],
        },
      ]);
    sandbox.exec(getJSCode as any).then(() => {
      expect(fakeDoc.createElement).toBeCalledTimes(2);
      expect(childNode.setAttribute).toBeCalledTimes(2);
      expect((childNode as any).type).toBe('module');
      expect((childNode as any).text).toBe('import { foo, bar } from "//foo.html/assets/./aaa.js"');
      spy.mockRestore();
      done();
    });
  });
});
