import {Block} from "./Block";
import {BlockReadOnlyConfig} from "./BlockConfigs";
import {BlockIO} from "./BlockProperty";

const defaultPropertyDescriptor = {writable: true, enumerable: true, configurable: true};

export const BlockProxy = {
  get(block: Block, field: string, receiver: object): any {
    let prop = block.getProperty(field, false);
    if (prop) {
      return prop._value;
    }
    return undefined;
  },

  set(block: Block, field: string, value: any, receiver: object): boolean {
    let prop = block.getProperty(field);
    prop.updateValue(value);
    return true;
  },

  ownKeys(block: Block): string[] {
    if (block._destroyed) {
      return [];
    }
    let result: string[] = [];
    if (!block._ioProps) {
      block._initIoCache();
    }
    for (let [field, prop] of block._ioProps) {
      if (prop._value !== undefined) {
        result.push(field);
      }
    }
    return result;
  },
  isExtensible(block: Block) {
    return true;
  },
  has(block: Block, field: string): boolean {
    let prop = block.getProperty(field, false);
    return (prop && prop._value !== undefined);
  },
  getOwnPropertyDescriptor(block: Block, field: string): PropertyDescriptor | undefined {
    return defaultPropertyDescriptor;
  }
};

export const BlockDeepProxy = {
  ...BlockProxy,

  get(block: Block, field: string, receiver: object): any {
    let prop = block.getProperty(field, false);
    if (prop) {
      let val = prop._value;
      if (val instanceof Block) {
        return new Proxy(prop._value, BlockDeepProxy);
      }
      return val;
    }
    return undefined;
  },
};
