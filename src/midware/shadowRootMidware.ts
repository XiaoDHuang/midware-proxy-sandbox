import { IMicroApp, MidwareSystem, NextFn, PluginEvent } from "@satumjs/types";

export function traverseNode(el: HTMLElement, vmContext:any) {

  if (el.ownerDocument === document) {
    Object.defineProperty(el, 'ownerDocument', {
      get() {
        return vmContext.document;
      }
    })
  };
  

  Array.from(el.childNodes).forEach((child: HTMLElement) => {
    traverseNode(child, vmContext);
  })
}

export const getAppShadowRoot = (container: String | HTMLElement, vmContext: any) => {
  let shadowRoot:any = null;
  if (typeof container === 'string') {
    container = document.querySelector(container) as any;
  }

  if (!(container instanceof HTMLElement)) {
    throw Error('app config rule of container property is css Selector or HTMLElement')
  }

  if (container instanceof ShadowRoot) {
    shadowRoot = container;
  }

  if (container.shadowRoot instanceof ShadowRoot) {
    shadowRoot = container.shadowRoot;
  }

  if (!shadowRoot) {
    shadowRoot = container.attachShadow({mode: 'open'});
  }

  shadowRoot.getElementsByTagName = function(tagName:string) {
    return shadowRoot.querySelectorAll(tagName);
  }

  shadowRoot.getElementsByClassName = function(className:string) {
    return shadowRoot.querySelectorAll(`.${className}`);
  }

  const appendChild = shadowRoot.appendChild.bind(shadowRoot);
  shadowRoot.appendChild = function(el:HTMLElement) {
    traverseNode(el, vmContext);
    return appendChild(el);
  }


  shadowRoot.tagName = '';
  shadowRoot.getAttribute = () => null;
  
  return shadowRoot;
}

export function shadowRootMidware(system: MidwareSystem, microApps: IMicroApp[], next: NextFn) {
  system.event(`_${PluginEvent.sandboxRouteHistory}`, ({vm}) => {
    microApps.find(app => {
      const actors = app.getRefActors();
      return actors.find((actor) => {
        vm.document.shadowRoot = actor.container = getAppShadowRoot(actor.container, actor.sandbox.vmContext);
        return (actor.sandbox.vmContext === vm)
      })
    })
  })

  next();
}