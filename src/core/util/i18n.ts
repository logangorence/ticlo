import {FunctionDesc} from "../block/Descriptor";
import i18next from "i18next";

export async function init(lng?: string) {
  await new Promise((receive, reject) => {
    i18next.init({lng}, receive);
  });
}

const numberReg = /[0-9]/;

export function translateType(type: string, namespace?: string): string {
  if (!type) {
    return '';
  }
  let i18ns = namespace ? `ticlo-${namespace}` : 'ticlo-block';
  return i18next.t(`${type}.@name`, {ns: i18ns, defaultValue: type});
}

export function translateProperty(type: string, name: string, namespace?: string): string {
  if (!type) {
    return name || '';
  }
  let i18ns = namespace ? `ticlo-${namespace}` : 'ticlo-block';
  let numMatch = name.match(numberReg);
  if (numMatch) {
    let baseName = name.substr(0, numMatch.index);
    let numStr = name.substr(numMatch.index);
    return `${i18next.t(`${type}.${baseName}.@name`, {ns: i18ns, defaultValue: baseName})}${numStr}`;
  } else {
    return i18next.t(`${type}.${name}.@name`, {ns: i18ns, defaultValue: name});
  }
}
