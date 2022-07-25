import { FileType, IMicroApp, MidwareName, MidwareSystem, NextFn } from "@satumjs/types";

const fontFaceSet = new Set()
export function fontFaceMidware(system: MidwareSystem, microApps: IMicroApp[], next: NextFn) {
  const fontFaceRuleReg = /@font-face[\s]*\{([\w\W](?![\{\}]))+[^\}]\}/g;
  system.set(MidwareName.code, function(code: string, url: string) {
    if (fontFaceSet.has(url)) return;
    fontFaceSet.add(url);

    var extName = system.fileExtName(url);

    const app = microApps.find((function(app) {
        return app.fileExtNameMap[url]
    }));

    if (extName !== FileType.CSS) return;

    const fontFaceRuleContent = code.match(fontFaceRuleReg);
    if (fontFaceRuleContent) {
      const style = document.createElement('style');
      style.textContent = fontFaceRuleContent.join('\n');
      style.setAttribute('data-url', url);
      style.setAttribute('app-name', (app && app.name) || '');
      document.head.appendChild(style);
    }
  })

  next();
}