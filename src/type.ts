import { FakeDocument, FakeLocation, ISandbox } from "@satumjs/types";

interface ProxySandboxOptions {
  useSandBox: boolean;
  winVariable(prop: PropertyKey, vmContext: ISandbox['vmContext'], global: Window): any;
  docVariable(prop: PropertyKey, proxyDoc: any, document: Document, fakeWin:ISandbox['vmContext']): any;
  locationVariable(prop: PropertyKey, locationProx: any, location:Location, fakeWin:ISandbox['vmContext']):any;
}


export {
  ProxySandboxOptions
}