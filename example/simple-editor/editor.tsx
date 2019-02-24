import * as React from 'react';
import * as ReactDOM from 'react-dom';
import {Menu, Icon, Dropdown, Button, Card} from 'antd';
import NodeTree from "../../src/editor/node-tree/NodeTree";
import {Block, Root} from "../../src/common/block/Block";
import {makeLocalConnection} from "../../src/common/connect/LocalConnection";
import {TIcon} from "../../src/editor/icon/Icon";
import '../../src/common/functions/basic/Math';
import '../../src/common/functions/basic/String';
import {sampleData} from "./sample-data";
import BlockStage from "../../src/editor/block/BlockStage";
import {initEditor} from "../../src/editor";
import {PropertyList} from "../../src/editor/property/PropertyList";
import {ClientConnection} from "../../src/common/connect/ClientConnection";

interface Props {
  conn: ClientConnection;
}

interface State {
  selectedKeys: string[];
}

class App extends React.PureComponent<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {'selectedKeys': ['example.add']};
  }

  onSelect = (keys: string[]) => {
    this.setState({'selectedKeys': keys});
  };

  render() {
    let {conn} = this.props;
    let {selectedKeys} = this.state;
    return (
      <div style={{height: '100%'}}>

        <div>
          <NodeTree conn={conn} basePath="example" style={{width: '300px', height: '600px'}}/>
          <BlockStage conn={conn} basePath="example" onSelect={this.onSelect}
                      style={{
                        width: '800px',
                        height: '800px',
                        left: '300px',
                        top: '0',
                        position: 'absolute',
                        // opacity: 0.1
                      }}/>
          <Card size='small'
                style={{width: '300px', height: '800px', left: '1100px', top: '10px', position: 'absolute'}}>
            <PropertyList conn={conn} keys={selectedKeys}
            />
          </Card>

        </div>
      </div>
    );
  }
}

(async () => {
  await initEditor();
  let job = Root.instance.addJob('example');
  job.load(sampleData);

  let [server, client] = makeLocalConnection(Root.instance);

  ReactDOM.render(
    <App conn={client}/>,
    document.getElementById('app')
  );
})();
