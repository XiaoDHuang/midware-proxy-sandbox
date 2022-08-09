import { ISandbox, fakeWrapTagName} from '@satumjs/types';

export function getFakeBody(sandbox: ISandbox) {
  const body = sandbox.body.querySelector(fakeWrapTagName) as HTMLElement;

  return body;
}
