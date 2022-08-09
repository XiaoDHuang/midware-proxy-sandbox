jest.mock('@satumjs/async-override');
import { FakeDocument, FileType } from '@satumjs/types';
import { getFileExt } from '@satumjs/utils'
import  {fontFaceMidware} from './fontFaceMidware'
import  {shadowRootMidware, traverseNode, getAppShadowRoot} from './shadowRootMidware'



describe('@satumjs/font-face-midware test', () => {
  const cssUrl = 'http://www.com/a.css';
  const cssCode = `
  @font-face {
    font-family: "iconfont";
    src: url('www.com') format('woff2');
  }
  `;

  const cssUrl2 = 'http://www.com/a1.css';
  const cssCode2 = `
    color: red;
  `;

  const jsUrl = 'http://www.com/a.js';
  const jsCode = 'console.log(111)'

  let fontFaceCode: any;
  const fakeSystem = {options:{}, fileExtName: getFileExt,  set: jest.fn(), use: jest.fn()} as any;
  beforeEach(() => {
    const microApps: any[] = [
      { name: 'foo', fileExtNameMap: {[cssUrl]: 'foo'}}, 
      { name: 'bar', fileExtNameMap: {} }
    ];

    const next = jest.fn();
    fontFaceMidware(fakeSystem, microApps, next);
    expect(fakeSystem.set).toBeCalled();
    expect(next).toBeCalled();

    fontFaceCode = fakeSystem.set.mock.calls[0][1];
  });

  test('css code', () => {
    fontFaceCode(cssCode, cssUrl);
    const fontStyleList = document.head.querySelectorAll('style[app-name]');
    const len = fontStyleList.length;
    const textContent = fontStyleList[0].textContent;
    expect(len).toEqual(1);
    expect(cssCode).toMatch(textContent || '');

    // 再次匹配
    fontFaceCode(cssCode, cssUrl);
    const fontStyleList2 = document.head.querySelectorAll('style[app-name]');
    expect(fontStyleList2.length).toBe(1);


    // 匹配JS
    fontFaceCode(jsCode, jsUrl);
    const fontStyleList3 = document.head.querySelectorAll('style[app-name]');
    expect(fontStyleList3.length).toBe(1);
    const style = fontStyleList3[0];
    const appName = style?.getAttribute('app-name');
    const dataUrl = style?.getAttribute('data-url');
    expect(appName).toEqual('foo');
    expect(dataUrl).toEqual(cssUrl);

    // 匹配空CSS font-face rule
    fontFaceCode(cssCode2, cssUrl2);
    const fontStyleList4 = document.head.querySelectorAll('style[app-name]');
    expect(fontStyleList4.length).toBe(1);
  })
});


describe('@satumjs/shadowRootMidware test', () => {
  let eventCallback = null;
  beforeEach(() => {
    const fakeSystem = {options:{}, event: jest.fn(), fileExtName: getFileExt, use: jest.fn()} as any;
    const microApps: any[] = [
      { name: 'foo', fileExtNameMap: {}}, 
      { name: 'bar', fileExtNameMap: {} }
    ];
    const next = jest.fn();

    shadowRootMidware(fakeSystem, microApps, next);
    expect(fakeSystem.event).toBeCalled();
    expect(next).toBeCalled();

    eventCallback = fakeSystem.event.mock.calls[0][1];
  });


  const ownerDocument = {};
  const vm = {document: ownerDocument}
  const documentElement = document.documentElement;
  test('shadowRootMidware traverseNode', () => {
    traverseNode(documentElement, vm);
    expect(document.body.ownerDocument).toEqual(ownerDocument);
    expect(document.head.ownerDocument).toEqual(ownerDocument);

    const rootDiv = document.createElement('div');
    rootDiv.setAttribute('id', 'root');
    document.body.append(rootDiv);
    const shadowDom = getAppShadowRoot('#root', vm);
    expect(shadowDom).toBeInstanceOf(ShadowRoot);


    const div = document.createElement('div');
    document.body.append(div);
    const shadowDom2 = getAppShadowRoot(div, vm);
    expect(shadowDom2).toBeInstanceOf(ShadowRoot);
  })
})
