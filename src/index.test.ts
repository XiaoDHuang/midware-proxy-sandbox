import { FileType } from '@satumjs/types';
import proxySandboxMidware from '.';

describe('@satumjs/midware-proxy-sandbox test', () => {
  let Sandbox: any;
  beforeEach(() => {
    const fakeSystem = { options: {}, set: jest.fn() } as any;
    const microApps: any[] = [{ name: 'foo' }, { name: 'bar' }];
    const next = jest.fn();
    proxySandboxMidware(fakeSystem, microApps, next);
    expect(fakeSystem.set).toBeCalled();
    Sandbox = fakeSystem.set.mock.calls[0][1];
  });

  test('new Sandbox', () => {
    const dateSpy = jest.spyOn(Date, 'now').mockImplementation(() => 1234);
    const sandbox = new Sandbox();
    expect('appName' in sandbox).toBe(true);
    expect(sandbox.appName).toBe(undefined);
    expect(sandbox.actorId).toBe(undefined);
    expect(sandbox.fakeWindowName).toBe('fakeWindow1234');
    expect(sandbox.body).toBeUndefined();
    expect(sandbox.vmContext === window[sandbox.fakeWindowName]).toBe(true);
    expect(sandbox.vmContext['DRIVE_BY_SATUMMICRO']).toBe(true);
    dateSpy.mockRestore();
  });

  test('init/destory', () => {
    const sandbox = new Sandbox({ appName: 'foo', actorId: 'foo' });
    const appBody = { appendChild: jest.fn() } as any;
    const wrapper = {} as any;
    const fakeDoc = { createElement: jest.fn() };
    const spyDoc = jest.spyOn(window, 'document', 'get').mockImplementation(() => fakeDoc as any);

    fakeDoc.createElement.mockReturnValueOnce(appBody).mockReturnValueOnce(wrapper);
    sandbox.init().then(() => {
      expect(sandbox.body).toEqual(appBody);
      expect(fakeDoc.createElement).toBeCalledTimes(2);
      appBody.parentNode = null;
      sandbox.destory().then(() => {
        appBody.parentNode = { removeChild: jest.fn() };
        sandbox.destory().then(() => expect(appBody.parentNode?.removeChild).toHaveBeenCalled());
      });
    });
    spyDoc.mockRestore();
  });

  test('exec', () => {
    const sandbox = new Sandbox({ appName: 'foo', actorId: 'foo' });
    sandbox.exec(jest.fn().mockResolvedValue('aaa'), FileType.CSS).then((res: any) => expect(res).toBe('aaa'));
    sandbox.exec(jest.fn().mockResolvedValue(''));
  });
});
