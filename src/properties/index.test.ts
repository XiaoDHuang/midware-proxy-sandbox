jest.mock('@satumjs/async-override');
import { FakeDocument } from '@satumjs/types';
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
  let fakeDoc: any;
  let options: any;
  let proxyDoc: FakeDocument;
  let spyDoc: any;
  const getFakeHead = jest.fn();

  beforeEach(() => {
    fakeDoc = {
      body: { parentNode: { foo: jest.fn(), bar: 'bar' } },
      getElementsByTagName: jest.fn(),
      querySelector: jest.fn(),
      querySelectorAll: jest.fn(),
      xxx: 'bbb',
      foo: jest.fn(),
    };
    options = { docVariable: jest.fn() };
    spyDoc = jest.spyOn(window, 'document', 'get').mockImplementation(() => fakeDoc);

    getFakeHead.mockReturnValue('aaa');
    proxyDoc = getFakeDocument(getFakeHead, options);
  });
  afterEach(() => spyDoc.mockRestore());

  test('proxyDocument head/documentElement', () => {
    expect(proxyDoc.head).toBe('aaa');
    expect((proxyDoc.head as any) === 'aaa').toBe(true);
    expect(getFakeHead).toBeCalledTimes(1);

    expect((proxyDoc.documentElement as any).bar).toBe(fakeDoc.body.parentNode.bar);
    expect(proxyDoc.documentElement.parentNode).toEqual(proxyDoc);
    expect((proxyDoc.documentElement as any).foo === fakeDoc.body.parentNode.foo).toBe(false);
    expect((proxyDoc.documentElement as any).bar).toBe('bar');
  });

  test('proxyDocument getElementsByTagName/querySelector/querySelectorAll', () => {
    expect((proxyDoc.getElementsByTagName('html')[0] as any).bar).toBe(fakeDoc.body.parentNode.bar);
    expect((proxyDoc.querySelector('html') as any).bar).toBe(fakeDoc.body.parentNode.bar);
    expect(proxyDoc.querySelectorAll('head')[0]).toBe('aaa');
    expect(proxyDoc.querySelector('head')).toBe('aaa');
    fakeDoc.getElementsByTagName.mockReturnValueOnce(['bbb']);
    expect(proxyDoc.getElementsByTagName('xxx')).toEqual(['bbb']);
  });

  test('proxyDocument getter', () => {
    options.docVariable.mockReturnValueOnce('aaa');
    expect(proxyDoc['xxx']).toBe('aaa');
    // >>> null
    options.docVariable.mockReturnValueOnce(null);
    expect(proxyDoc['xxx']).toBe('bbb');
    // >>> undefined
    expect(proxyDoc['xxx']).toBe('bbb');

    expect(proxyDoc['foo'] === fakeDoc.foo).toBe(false);
  });

  test('proxyDocument setter/has/delete', () => {
    proxyDoc.bar = jest.fn();
    expect(proxyDoc['bar'] === fakeDoc.bar).toBe(false);
    expect('bar' in fakeDoc).toBe(false);
    expect('bar' in proxyDoc).toBe(true);
    delete proxyDoc.bar;
    expect('bar' in proxyDoc).toBe(false);

    proxyDoc.title = 'title';
    expect(fakeDoc.title).toBe('title');
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

    const onclick = jest.fn();
    proxyWin.onclick = onclick;
    expect('onclick' in proxyWin).toBe(true);
    expect(proxyWin.onclick).toBe(onclick);

    const bar = jest.fn();
    proxyWin.bar = bar;
    expect(sandbox.setVariable).toBeCalled();
    expect('bar' in proxyWin).toBe(true);
    expect(typeof proxyWin.bar).toBe('function');
    expect(proxyWin.bar === bar).toBe(true);
    delete proxyWin.bar;
    expect('bar' in proxyWin).toBe(false);

    expect(proxyWin.Date).toEqual(window.Date);
    expect(proxyWin.addEventListener === window.addEventListener).toBe(false);
  });
});
