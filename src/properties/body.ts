import { ISandbox } from '@satumjs/types';
import { satumMicroHeadAppendChildFactory } from '@satumjs/async-override';

export function getFakeBody(sandbox: ISandbox) {
  const xBody = sandbox.appWrap;
  const body = document.body;

  return xBody;
}
