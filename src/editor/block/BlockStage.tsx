import React, {KeyboardEvent} from "react";
import {ClientConnection} from "../../core/connect/ClientConnection";
import {DataMap} from "../../core/util/Types";
import {BlockItem, BlockView} from "./Block";
import {WireItem, WireView} from "./Wire";
import {AbstractPointerEvent, DragInitFunction, DragInitiator} from "rc-dock/lib/DragInitiator";
import {cssNumber} from "../../ui/util/Types";
import {FieldItem, Stage} from "./Field";
import {forAllPathsBetween} from "../../core/util/Path";
import {onDragBlockOver, onDropBlock} from "./DragDropBlock";

interface Props {
  conn: ClientConnection;
  basePath: string;
  style?: React.CSSProperties;
  onSelect?: (keys: string[]) => void;
}

export class BlockStage extends React.Component<Props, any> implements Stage {

  private _bgNode!: HTMLElement;
  private getBgRef = (node: HTMLDivElement): void => {
    this._bgNode = node;
  };

  getRefElement() {
    return this._bgNode;
  }

  private _selectRectNode!: HTMLElement;
  private getSelectRectRef = (node: HTMLDivElement): void => {
    this._selectRectNode = node;
  };

  _blocks: Map<string, BlockItem> = new Map<string, BlockItem>();
  _fields: Map<string, FieldItem> = new Map<string, FieldItem>();
  _fieldLinks: Map<string, Set<FieldItem>> = new Map<string, Set<FieldItem>>();

  onSelect() {
    let {onSelect} = this.props;
    if (onSelect) {
      let selectedKeys: string[] = [];
      for (let [blockKey, blockItem] of this._blocks) {
        if (blockItem.selected) {
          selectedKeys.push(blockItem.key);
        }
      }
      onSelect(selectedKeys);
    }
    this.selectionChanged = false;
  }

  selectionChanged = false;

  selectBlock(key: string, ctrl: boolean = false) {
    if (this._blocks.has(key)) {
      let block = this._blocks.get(key);
      if (ctrl) {
        block.setSelected(!block.selected);
        this.selectionChanged = true;
      } else {
        if (block.selected) {
          return;
        }
        for (let [blockKey, blockItem] of this._blocks) {
          if (key === blockKey) {
            if (!blockItem.selected) {
              blockItem.setSelected(true);
              this.selectionChanged = true;
            }
          } else if (blockItem.selected) {
            blockItem.setSelected(false);
            this.selectionChanged = true;
          }
        }
      }
      if (!block.selected && this.selectionChanged) {
        // current block is not selected, dragging wont start
        // update the onSelect event now
        this.onSelect();
      }
    }
  }

  _draggingBlocks?: [BlockItem, number, number][];
  _dragingSelect?: [number, number];

  isDraggingBlock(): boolean {
    return Boolean(this._draggingBlocks);
  }

  // drag a block, return true when the dragging is started
  startDragBlock(e: PointerEvent, initFunction: DragInitFunction) {
    this._draggingBlocks = [];
    for (let [blockKey, blockItem] of this._blocks) {
      if (blockItem.selected) {
        this._draggingBlocks.push([blockItem, blockItem.x, blockItem.y]);
      }
    }
    initFunction(this._bgNode, this.onDragBlockMove, this.onDragBlockEnd);
  }

  onDragBlockMove = (event: AbstractPointerEvent, dx: number, dy: number) => {
    for (let [block, x, y] of this._draggingBlocks) {
      block.setXYW(x + dx, y + dy, block.w, true);
    }
  };
  onDragBlockEnd = (event: AbstractPointerEvent, dx: number, dy: number) => {
    this._draggingBlocks = null;
    if (this.selectionChanged) {
      // call the onSelect callback only when mouse up
      this.selectionChanged = false;
      this.onSelect();
    }
  };

  onSelectRectDragStart = (e: PointerEvent, initFunction: DragInitFunction) => {
    this._dragingSelect = [e.offsetX, e.offsetY];
    initFunction(this._bgNode, this.onDragSelectMove, this.onDragSelectEnd);
    this._selectRectNode.style.display = 'block';
  };

  onDragSelectMove = (e: AbstractPointerEvent, dx: number, dy: number) => {
    let [x1, y1] = this._dragingSelect;
    let x2 = dx + x1;
    let y2 = dy + y1;
    this._selectRectNode.style.left = `${cssNumber(Math.min(x1, x2))}px`;
    this._selectRectNode.style.width = `${cssNumber(Math.abs(x1 - x2))}px`;
    this._selectRectNode.style.top = `${cssNumber(Math.min(y1, y2))}px`;
    this._selectRectNode.style.height = `${cssNumber(Math.abs(y1 - y2))}px`;
  };
  onDragSelectEnd = (e: AbstractPointerEvent, dx: number, dy: number) => {
    if (e) {
      // if e==null, then the dragging is canceled
      let [x1, y1] = this._dragingSelect;
      let x2 = dx + x1;
      let y2 = dy + y1;
      let left = Math.min(x1, x2) - 1;
      let right = Math.max(x1, x2) + 1;
      let top = Math.min(y1, y2) - 1;
      let bottom = Math.max(y1, y2) + 1;
      let addToSelect = e.shiftKey || e.ctrlKey;
      for (let [blockKey, blockItem] of this._blocks) {
        if (blockItem.x >= left && blockItem.w + blockItem.x <= right
          && blockItem.y >= top && blockItem.y + 24 <= bottom) {
          blockItem.setSelected(true);
        } else if (blockItem.selected && !addToSelect) {
          blockItem.setSelected(false);
        }
      }
      this.onSelect();
    }

    this._selectRectNode.style.display = null;
    this._selectRectNode.style.width = '0';
    this._dragingSelect = null;
  };

  linkField(souceKey: string, targetField: FieldItem) {
    if (!this._fieldLinks.has(souceKey)) {
      this._fieldLinks.set(souceKey, new Set<FieldItem>());
    }
    this._fieldLinks.get(souceKey).add(targetField);
    let sourceFound = forAllPathsBetween(souceKey, this.props.basePath, (path) => {
      let field = this._fields.get(path);
      if (field) {
        targetField.sourceChanged(field);
        return true;
      }
    });
    if (!sourceFound) {
      targetField.sourceChanged(null);
    }
  }

  unlinkField(sourceKey: string, targetField: FieldItem) {
    let links = this._fieldLinks.get(sourceKey);
    if (links) {
      links.delete(targetField);
      if (links.size === 0) {
        this._fieldLinks.delete(sourceKey);
      }
    }
  }

  registerField(key: string, item: FieldItem) {
    this._fields.set(key, item);
    if (this._fieldLinks.has(key)) {
      for (let target of this._fieldLinks.get(key)) {
        target.sourceChanged(item);
      }
    } else {
      let preFixPath = `${key}.`;
      for (let [path, links] of this._fieldLinks) {
        // search for children path to have a indirect binding wire
        if (path.startsWith(preFixPath)) {
          for (let target of links) {
            target.sourceChanged(item, true);
          }
        }
      }
    }
  }

  unregisterField(key: string, item: FieldItem) {
    if (this._fields.get(key) === item) {
      this._fields.delete(key);
      if (this._fieldLinks.has(key)) {
        for (let target of this._fieldLinks.get(key)) {
          target.sourceChanged(null);
        }
      } else {
        let preFixPath = `${key}.`;
        for (let [path, links] of this._fieldLinks) {
          // search for children path to remove indirect binding wire
          if (path.startsWith(preFixPath)) {
            for (let target of links) {
              if (target.inWire.source === item) {
                target.sourceChanged(null);
              }
            }
          }
        }
      }
    }
  }

  watchListener = {
    onUpdate: (response: DataMap) => {
      let changes = response.changes;
      for (let name in changes) {
        let change = changes[name];
        let key = `${this.props.basePath}.${name}`;
        if (change === null) {
          if (this._blocks.has(key)) {
            if (this._blocks.get(key).selected) {
              this.selectionChanged = true;
            }
            this._blocks.delete(key);
            this.forceUpdate();
          }
        } else {
          if (!this._blocks.has(key)) {
            this._blocks.set(key, new BlockItem(this.props.conn, this, key));
            this.forceUpdate();
          }
        }
      }
      if (this.selectionChanged) {
        this.onSelect();
      }
    }
  };

  constructor(props: Props) {
    super(props);
    props.conn.watch(props.basePath, this.watchListener);
  }

  shouldComponentUpdate(nextProps: Props, nextState: any) {
    if (nextProps.basePath !== this.props.basePath) {
      // TODO clear cached blocks
      this.props.conn.unwatch(this.props.basePath, this.watchListener);
      this.props.conn.watch(nextProps.basePath, this.watchListener);
    }
    return true;
  }

  onDragOver = (event: React.DragEvent) => {
    let {conn} = this.props;
    onDragBlockOver(conn, event);
  };

  onDrop = (event: React.DragEvent) => {
    let {conn} = this.props;
    onDropBlock(conn, event, this.createBlock);
  };

  createBlock = async (name: string, blockData: {[key: string]: any}) => {
    let {conn, basePath} = this.props;
    try {
      let newName = (await conn.createBlock(`${basePath}.${name}`, blockData, true)).name;
      let newKey = `${basePath}.${newName}`;
      this.selectBlock(newKey, false);
      this.onSelect(); // update the property list
    } catch (e) {
      // TODO show warning?
    }
  };

  deleteSelectedBlocks() {
    let {conn} = this.props;
    for (let [blockKey, blockItem] of this._blocks) {
      if (blockItem.selected) {
        conn.setValue(blockKey, undefined);
      }
    }
  }

  onKeyDown = (e: KeyboardEvent) => {
    switch (e.key) {
      case 'Delete': {
        this.deleteSelectedBlocks();
        return;
      }
    }
  };

  render() {
    let {style} = this.props;

    let children: React.ReactNode[] = [];

    // add wires
    for (let [key, fieldItem] of this._fields) {
      if (fieldItem.inWire) {
        children.push(<WireView key={`~${key}`} item={fieldItem.inWire}/>);
      }
    }
    // add blocks
    for (let [key, blockItem] of this._blocks) {
      children.push(<BlockView key={key} item={blockItem}/>);
    }

    return (
      <div style={style} className="ticl-block-stage" onDragOver={this.onDragOver} onDrop={this.onDrop}
           onKeyDown={this.onKeyDown} tabIndex={0}>
        <DragInitiator className='ticl-full' getRef={this.getBgRef} onDragInit={this.onSelectRectDragStart}/>
        {children}
        <div ref={this.getSelectRectRef} className="ticl-block-select-rect"/>
      </div>
    );
  }

  componentWillUnmount() {
    this.props.conn.unwatch(this.props.basePath, this.watchListener);
  }

  forceUpdate() {
    this.props.conn.callImmediate(this.safeForceUpdate);
  }

  safeForceUpdate = () => {
    super.forceUpdate();
  }
}
