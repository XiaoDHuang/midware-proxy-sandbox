jest.mock('@satumjs/async-override');
import { satumMicroHeadAppendChildFactory } from '@satumjs/async-override';
import { CtxEventDB, handleWinEvent, removeAllWinEvents, getFakeLocation, getFakeHead } from '.';

describe('property event', () => {
  test('handleWinEvent', () => {
    const spyRemove = jest.spyOn(window, 'removeEventListener').mockImplementation(() => jest.fn());
    const spyAdd = jest.spyOn(window, 'addEventListener').mockImplementation(() => jest.fn());
    const sandbox = { vmContext: {} } as any;
    const db: CtxEventDB = [];
    handleWinEvent(sandbox, db);

    const aaaEventCallback = jest.fn();
    sandbox.vmContext.addEventListener('aaa', aaaEventCallback);
    expect(db.length).toBe(1);
    sandbox.vmContext.removeEventListener('aaa', aaaEventCallback);
    expect(db.length).toBe(0);

    spyRemove.mockRestore();
    spyAdd.mockRestore();
  });

  test('removeAllWinEvents', () => {
    const spyRemove = jest.spyOn(window, 'removeEventListener').mockImplementation(() => jest.fn());
    const db: CtxEventDB = [{ event: 'foo', callback: jest.fn() }, { event: 'bar' } as any, { event: 'onclick', callback: jest.fn() }];
    removeAllWinEvents(db);
    expect(window['onclick']).toBe(null);
    expect(db.length).toBe(0);
    spyRemove.mockRestore();
  });
});

describe('property location', () => {
  test('getFakeLocation', () => {
    const fakeLoc = { hash: 'foo' } as any;
    const spy = jest.spyOn(window, 'location', 'get').mockImplementation(() => fakeLoc);
    const props = {} as any;
    const proxyLoc = getFakeLocation(props);
    proxyLoc.pathname = 'aaa';
    proxyLoc.href = 'bbb';
    expect(props.pathname).toBe('aaa');
    expect(fakeLoc.pathname).toBeUndefined();
    expect(proxyLoc.pathname).toBe('aaa');
    expect(props.href).toBeUndefined();
    expect(fakeLoc.href).toBe('bbb');
    expect(proxyLoc.href).toBe('bbb');
    expect('pathname' in proxyLoc).toBe(true);
    expect('href' in proxyLoc).toBe(true);
    expect(proxyLoc.hash).toBe('foo');

    const aaa = jest.fn();
    proxyLoc.aaa = aaa;
    expect(proxyLoc.aaa === aaa).toBe(false); // function has binded
    delete proxyLoc.aaa;
    expect(proxyLoc.aaa).toBeUndefined();
    spy.mockRestore();
  });
});

describe('property document.head', () => {
  test('getFakeHead', () => {
    const sandbox = { body: {} } as any;
    const bar = jest.fn();
    const spy = jest.spyOn(document, 'head', 'get').mockImplementation(() => ({ foo: 'foo', bar, appendChild: jest.fn() } as any));
    const proxyHead = getFakeHead(sandbox) as any;
    expect(proxyHead.foo).toBe('foo');
    expect(proxyHead.bar === bar).toBe(false);
    proxyHead.bat = 'bat';
    expect('bat' in proxyHead).toBe(true);
    expect(proxyHead.bat).toBe('bat');
    delete proxyHead.bat;
    expect(proxyHead.bat).toBeUndefined();

    (satumMicroHeadAppendChildFactory as any).mockReturnValue(jest.fn());
    proxyHead.appendChild({});
    expect(satumMicroHeadAppendChildFactory).toBeCalled();

    spy.mockRestore();
  });
});
