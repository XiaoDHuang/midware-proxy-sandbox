jest.mock('@satumjs/async-override');
import { satumMicroHeadAppendChildFactory } from '@satumjs/async-override';
import { CtxEventDB, handleWinEvent, removeAllWinEvents, getFakeLocation, getFakeHead, getFakeDocument, getFakeWindow } from '.';

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

describe('property document', () => {
  test('getFakeDocument', () => {
    const fakeDoc = {
      body: { parentNode: { foo: jest.fn(), bar: 'bar' } },
      getElementsByTagName: jest.fn(),
      querySelector: jest.fn(),
      querySelectorAll: jest.fn(),
      xxx: 'bbb',
      foo: jest.fn(),
    } as any;
    const spy = jest.spyOn(window, 'document', 'get').mockImplementation(() => fakeDoc);
    const options = { docVariable: jest.fn() };

    const getFakeHead = jest.fn();
    getFakeHead.mockReturnValue('aaa');
    const proxyDoc = getFakeDocument(getFakeHead, options);
    expect(proxyDoc.head).toBe('aaa');
    expect((proxyDoc.head as any) === 'aaa').toBe(true);
    expect(getFakeHead).toBeCalledTimes(1);

    expect((proxyDoc.documentElement as any).bar).toBe(fakeDoc.body.parentNode.bar);
    expect(proxyDoc.documentElement.parentNode).toEqual(proxyDoc);
    expect((proxyDoc.documentElement as any).foo === fakeDoc.body.parentNode.foo).toBe(false);
    expect((proxyDoc.documentElement as any).bar).toBe('bar');

    expect((proxyDoc.getElementsByTagName('html')[0] as any).bar).toBe(fakeDoc.body.parentNode.bar);
    expect(proxyDoc.getElementsByTagName('head')[0]).toBe('aaa');
    expect(proxyDoc.querySelector('head')).toBe('aaa');
    fakeDoc.getElementsByTagName.mockReturnValueOnce(['bbb']);
    expect(proxyDoc.getElementsByTagName('xxx')).toEqual(['bbb']);

    options.docVariable.mockReturnValueOnce('aaa');
    expect(proxyDoc['xxx']).toBe('aaa');
    // >>> null
    options.docVariable.mockReturnValueOnce(null);
    expect(proxyDoc['xxx']).toBe('bbb');
    // >>> undefined
    expect(proxyDoc['xxx']).toBe('bbb');

    expect(proxyDoc['foo'] === fakeDoc.foo).toBe(false);

    proxyDoc.bar = jest.fn();
    expect(proxyDoc['bar'] === fakeDoc.bar).toBe(false);
    expect('bar' in fakeDoc).toBe(false);
    expect('bar' in proxyDoc).toBe(true);
    delete proxyDoc.bar;
    expect('bar' in proxyDoc).toBe(false);

    proxyDoc.title = 'title';
    expect(fakeDoc.title).toBe('title');

    spy.mockRestore();
  });
});

describe('property window', () => {
  test('getFakeWindow', () => {
    const sandbox = { setVariable: jest.fn() } as any;
    const db: CtxEventDB = [];
    const options = { winVariable: jest.fn() };
    const proxyWin = getFakeWindow(sandbox, db, {} as any, {} as any, options);

    expect(proxyWin.self).toEqual(proxyWin);
    expect(proxyWin.document).toEqual({});
    expect(proxyWin.location).toEqual({});

    options.winVariable.mockReturnValueOnce('aaa');
    expect(proxyWin.name).toBe('aaa');
    // >>> null
    options.winVariable.mockReturnValueOnce(null);
    expect(proxyWin.name).toBe('');
    // >>> undefined
    expect(proxyWin.name).toBe('');

    proxyWin.onclick = jest.fn();
    expect('onclick' in proxyWin).toBe(true);
    proxyWin.bar = jest.fn();
    expect(sandbox.setVariable).toBeCalled();
    expect('bar' in proxyWin).toBe(true);
    expect(typeof proxyWin.bar).toBe('function');
    delete proxyWin.bar;
    expect('bar' in proxyWin).toBe(false);

    expect(proxyWin.Date).toEqual(window.Date);
    expect(proxyWin.addEventListener === window.addEventListener).toBe(false);
  });
});
