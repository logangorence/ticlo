import React from "react";
import {Button, Tooltip} from "antd";
import {ClientConnection, ValueState, ValueUpdate} from "../../common/connect/ClientConnection";
import {FunctionDesc, PropDesc} from "../../common/block/Descriptor";
import {translateProperty} from "../../common/util/i18n";
import {MultiSelectComponent, MultiSelectLoader} from "./MultiSelectComponent";
import {GroupEditor} from "./GroupEditor";
import {NumberEditor} from "./value/NumberEditor";
import {StringEditor} from "./value/StringEditor";
import {ToggleEditor} from "./value/ToggleEditor";
import {SelectEditor} from "./value/SelectEditor";
import {DragStore} from "../../ui/util/DragStore";
import equal from "fast-deep-equal";
import {PasswordEditor} from "./value/PasswordEditor";
import {ExpandIcon} from "../../ui/component/Tree";
import {PropertyList} from "./PropertyList";
import {arrayEqual} from "../../common/util/Compare";

const typeEditorMap: {[key: string]: any} = {
  'number': NumberEditor,
  'string': StringEditor,
  'toggle': ToggleEditor,
  'select': SelectEditor,
  'password': PasswordEditor,
};

class PropertyLoader extends MultiSelectLoader<PropertyEditor> {
  valueKey: string;
  name: string;

  constructor(key: string, parent: PropertyEditor) {
    super(key, parent);
    this.name = parent.props.name;
    this.valueKey = `${key}.${this.name}`;
    this.conn.subscribe(this.valueKey, this.listener);
  }

  cache: ValueState;
  subBlock = false;
  listener = {
    onUpdate: (response: ValueUpdate) => {
      this.cache = response.cache;
      if (response.change.hasOwnProperty('value') || response.change.hasOwnProperty('bindingPath')) {
        this.subBlock = response.cache.bindingPath === `~${this.name}.output`;
        this.parent.safeForceUpdate();
      }
    }
  };

  destroy() {
    this.conn.unsubscribe(this.valueKey, this.listener);
  }

}

interface Props {
  conn: ClientConnection;
  keys: string[];
  name: string; // name is usually same as propDesc.name, but when it's in group, it will have a number after
  funcDesc: FunctionDesc;
  propDesc: PropDesc;
}

interface State {
  unlocked: boolean;
  showSubBlock: boolean;
}

export class PropertyEditor extends MultiSelectComponent<Props, State, PropertyLoader> {

  constructor(props: Readonly<Props>) {
    super(props);

    this.state = {unlocked: false, showSubBlock: false};
    this.updateLoaders(props.keys, PropertyLoader);
  }

  // map parent keys to subblock keys
  // this needs to be cached to optimize children rendering
  subBlockKeys: string[];

  buildSubBlockKeys(props: Props) {
    let {name, keys} = props;
    this.subBlockKeys = keys.map((s: string) => `${s}.~${name}`);
  }

  UNSAFE_componentWillReceiveProps(nextProps: Props) {
    if (this.subBlockKeys && !arrayEqual(nextProps.keys, this.props.keys)) {
      this.buildSubBlockKeys(nextProps);
    }
  }


  unlock = (e: any) => {
    this.setState({unlocked: !this.state.unlocked});
  };
  expandSubBlock = (e: any) => {
    this.setState({showSubBlock: !this.state.showSubBlock});
  };

  onChange = (value: any) => {
    let {conn, keys, name} = this.props;
    for (let key of keys) {
      conn.setValue(`${key}.${name}`, value);
    }
  };

  onDragStart = (event: React.DragEvent) => {
    let {conn, keys, name} = this.props;

    let fields = keys.map((s) => `${s}.${name}`);
    event.dataTransfer.setData('text/plain', fields.join(','));

    DragStore.dragStart(conn, {fields});
  };
  onDragOver = (event: React.DragEvent) => {
    let {conn, keys, name, propDesc} = this.props;

    if (propDesc.readonly) {
      event.dataTransfer.dropEffect = 'none';
      return;
    }

    let dragFields: string[] = DragStore.getData(conn, 'fields');
    if (Array.isArray(dragFields) &&
      (dragFields.length === 1 || dragFields.length === keys.length)) {
      let fields = keys.map((s) => `${s}.${name}`);
      if (!equal(fields, dragFields)) {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'link';
        return;
      }
    }
    event.dataTransfer.dropEffect = 'none';
  };
  onDrop = (event: React.DragEvent) => {
    let {conn, keys, name} = this.props;

    let dragFields: string[] = DragStore.getData(conn, 'fields');
    if (Array.isArray(dragFields)) {
      let fields = keys.map((s) => `${s}.${name}`);
      if (dragFields.length === 1) {
        for (let field of fields) {
          if (dragFields[0] !== field) {
            conn.setBinding(field, dragFields[0], true);
          }
        }
      } else if (dragFields.length === fields.length) {
        for (let i = 0; i < fields.length; ++i) {
          if (dragFields[i] !== fields[i]) {
            conn.setBinding(fields[i], dragFields[i], true);
          }
        }
      }
    }
  };
  onDragEnd = (event: React.DragEvent) => {
    DragStore.dragEnd();
  };

  renderImpl() {
    let {conn, keys, funcDesc, propDesc, name} = this.props;
    let {unlocked, showSubBlock} = this.state;

    this.updateLoaders(keys, PropertyLoader);

    ready: {
      let it = this.loaders[Symbol.iterator]();
      let [firstKey, firstLoader] = it.next().value;
      let firstCache = firstLoader.cache;
      if (!firstCache) {
        break ready;
      }

      let onChange = propDesc.readonly ? null : this.onChange;

      let value = firstCache.value;
      let valueSame = true;

      let bindingPath = firstCache.bindingPath;
      let hasBinding = (firstCache.bindingPath != null);
      let bindingSame = true;
      let subBlock = firstLoader.subBlock;

      for (let [key, loader] of it) {
        let cache = loader.cache;
        if (!cache) {
          break ready;
        }
        if (!Object.is(value, cache.value)) {
          valueSame = false;
        }
        if (bindingPath !== cache.bindingPath) {
          bindingSame = false;
        }
        if (cache.bindingPath != null) {
          hasBinding = true;
        }
        if (!loader.subBlock) {
          subBlock = false;
        }
      }

      let inBoundClass;
      if (subBlock) {
        // inBoundClass = 'ticl-prop-inbound';
      } else if (hasBinding) {
        inBoundClass = 'ticl-prop-inbound';
        if (!bindingSame) {
          bindingPath = '???';
        }
      }

      // lock icon
      let locked = (hasBinding || !valueSame);
      let renderLockIcon = locked && !propDesc.readonly;
      let locktooltip: string;
      if (renderLockIcon) {
        if (unlocked) {
          locktooltip = 'Unlocked for editing\nDouble click to lock';
        } else if (hasBinding) {
          locktooltip = 'Editing blocked by binding\nDouble click to edit';
        } else if (!valueSame) {
          locktooltip = 'Inconsistent values\nDouble click to edit';
        }
      }

      // expand icon
      let renderSubBlock = subBlock && showSubBlock;
      if (renderSubBlock && !this.subBlockKeys) {
        this.buildSubBlockKeys(this.props);
      }


      let editor: React.ReactNode;
      let EditorClass = typeEditorMap[propDesc.type];
      if (EditorClass) {
        editor =
          <EditorClass value={value} desc={propDesc} locked={locked && !unlocked} onChange={onChange}/>;
      }

      return (
        <div className='ticl-property'>
          {inBoundClass ? <div className={inBoundClass} title={bindingPath}/> : null}
          <div className={`ticl-property-name${propDesc.readonly ? ' ticl-property-readonly' : ''}`}
               draggable={true} onDragStart={this.onDragStart}
               onDragOver={this.onDragOver} onDrop={this.onDrop} onDragEnd={this.onDragEnd}>
            {translateProperty(funcDesc.name, name, funcDesc.ns)}
          </div>
          {renderLockIcon ?
            <Tooltip title={locktooltip} overlayClassName='ticl-tooltip'>
              <Button shape='circle' tabIndex={-1} icon={unlocked ? 'edit' : 'lock'}
                      onDoubleClick={this.unlock}> </Button>
            </Tooltip>
            : null}
          {subBlock ?
            <ExpandIcon opened={showSubBlock ? 'opened' : 'closed'} onClick={this.expandSubBlock}/>
            : null
          }
          <div className='ticl-property-value'>
            {editor}
          </div>
          {
            renderSubBlock ?
              <PropertyList conn={conn} keys={this.subBlockKeys}/>
              : null
          }
        </div>
      );
    }
    // loaders are not ready
    return <div className='ticl-property'/>;
  }
}