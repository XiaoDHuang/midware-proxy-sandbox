import { FakeDocument, FakeLocation, FakeWindow, ISandbox, KeyObject } from '@satumjs/types';
import { CtxEventDB } from './event';

const iframe = document.createElement('iframe');
iframe.style.display = 'none';
document.body.append(iframe);

export function getCleanWindow() {
  return iframe.contentWindow;
}