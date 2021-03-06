import {Types} from "../../block/Type";
import {PureFunction, FunctionData} from "../../block/BlockFunction";
import {FunctionDesc} from "../../block/Descriptor";

const descriptorN: FunctionDesc = {
  name: '',
  icon: '',
  useLength: true,
  properties: [
    {group: '', properties: [{name: '', type: 'number', visible: 'high'}]},
    {name: 'output', type: 'number', readonly: true}
  ],
};
const descriptor2: FunctionDesc = {
  name: '',
  icon: '',
  properties: [
    {name: '0', type: 'number', visible: 'high'},
    {name: '1', type: 'number', visible: 'high'},
    {name: 'output', type: 'number', readonly: true}
  ],
};


export class AddFunction extends PureFunction {
  run(): any {
    let len = this._data.getLength();
    if (!(len >= 0)) {
      len = 2;
    }
    if (len > 0) {
      let sum = 0;
      for (let i = 0; i < len; ++i) {
        let val = this._data.getValue(String(i));
        if (val == null) {
          this._data.output(undefined);
          return;
        }
        sum += Number(val);
      }
      this._data.output(sum);
    } else {
      this._data.output(undefined);
    }
  }
}

AddFunction.prototype.priority = 0;
AddFunction.prototype.useLength = true;
Types.add(AddFunction, {
  ...descriptorN,
  name: 'add',
  icon: 'fas:plus'
});


export class MultiplyFunction extends PureFunction {
  run(): any {
    let len = this._data.getLength();
    if (!(len >= 0)) {
      len = 2;
    }
    if (len > 0) {
      let product = 1;
      for (let i = 0; i < len; ++i) {
        let val = this._data.getValue(String(i));
        if (val == null) {
          this._data.output(undefined);
          return;
        }
        product *= Number(val);
      }
      this._data.output(product);
    } else {
      this._data.output(undefined);
    }
  }
}

MultiplyFunction.prototype.priority = 0;
MultiplyFunction.prototype.useLength = true;
Types.add(MultiplyFunction, {
  ...descriptorN,
  name: 'multiply',
  icon: 'fas:times'
});


export class SubtractFunction extends PureFunction {
  run(): any {
    let v0 = this._data.getValue('0');
    let v1 = this._data.getValue('1');
    if (v0 == null || v1 == null) {
      this._data.output(undefined);
    } else {
      this._data.output(Number(v0) - Number(v1));
    }
  }
}

SubtractFunction.prototype.priority = 0;
Types.add(SubtractFunction, {
  ...descriptor2,
  name: 'subtract',
  icon: 'fas:minus'
});


export class DivideFunction extends PureFunction {
  run(): any {
    let v0 = this._data.getValue('0');
    let v1 = this._data.getValue('1');
    if (v0 == null || v1 == null) {
      this._data.output(undefined);
    } else {
      this._data.output(Number(v0) / Number(v1));
    }
  }
}

DivideFunction.prototype.priority = 0;
Types.add(DivideFunction, {
  ...descriptor2,
  name: 'divide',
  icon: 'fas:divide'
});
