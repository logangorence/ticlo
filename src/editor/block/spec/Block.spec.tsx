import {assert} from "chai";
import SimulateEvent from "simulate-event";
import React from 'react';
import {BlockStage} from "../../../editor";
import {Block, Root} from "../../../core";
import {destroyLastLocalConnection, makeLocalConnection} from "../../../core/connect/LocalConnection";
import {shouldHappen, shouldReject} from "../../../core/util/test-util";
import ReactDOM from "react-dom";
import {removeLastTemplate, loadTemplate, querySingle} from "../../../ui/util/test-util";
import {initEditor} from "../../index";
import {arrayEqual} from "../../../core/util/Compare";

describe("editor BlockStage", function () {

  beforeEach(async function () {
    await initEditor();
  });

  afterEach(function () {
    removeLastTemplate();
    destroyLastLocalConnection();
  });

  it('single block', async function () {


    let job = Root.instance.addJob('BlockStage1');
    job.load({
      add: {
        '#is': 'add',
        '0': 1,
        '1': 2,
        '@b-xyw': [123, 234, 345],
        '@b-p': ['0', '1', 'output']
      }
    });

    let [server, client] = makeLocalConnection(Root.instance);

    let [component, div] = loadTemplate(
      <BlockStage conn={client} basePath="BlockStage1"
                  style={{width: '800px', height: '800px'}}/>, 'editor');

    await shouldHappen(() => div.querySelector('.ticl-block'));

    let block = div.querySelector('.ticl-block') as HTMLDivElement;
    assert.equal(block.offsetLeft, 123);
    assert.equal(block.offsetTop, 234);
    assert.equal(block.offsetWidth, 345);

    // test all fields in the block body
    await shouldHappen(() => querySingle("//div.ticl-field-name[text()='0']/../div.ticl-field-value/span[text()='1']", div));
    assert.isNotNull(querySingle("//div.ticl-field-name[text()='1']/../div.ticl-field-value/span[text()='2']", div));
    assert.isNotNull(querySingle("//div.ticl-field-name[text()='output']/../div.ticl-field-value/span[text()='3']", div));

    // check block icon
    assert.isNotNull(querySingle("//div.tico-icon-svg.tico-fas-plus", div));

    // test value update
    job.queryProperty('add.0').updateValue(5);
    await shouldHappen(() => querySingle("//div.ticl-field-name[text()='0']/../div.ticl-field-value/span[text()='5']", div));
    assert.isNotNull(querySingle("//div.ticl-field-name[text()='output']/../div.ticl-field-value/span[text()='7']", div));

    // test change type
    job.queryProperty('add.#is').setValue('subtract');
    await shouldHappen(() => querySingle("//div.ticl-field-name[text()='output']/../div.ticl-field-value/span[text()='3']", div));
    // check block icon again
    assert.isNotNull(querySingle("//div.tico-icon-svg.tico-fas-minus", div));

    Root.instance.deleteValue('BlockStage1');
  });

  it('drag block', async function () {
    let job = Root.instance.addJob('BlockStage2');
    job.load({
      add: {
        '#is': 'add',
        '@b-xyw': [123, 234, 345],
        '@b-p': ['0', '1', 'output']
      }
    });

    let [server, client] = makeLocalConnection(Root.instance);

    let [component, div] = loadTemplate(
      <BlockStage conn={client} basePath="BlockStage2"
                  style={{width: '800px', height: '800px'}}/>, 'editor');

    await shouldHappen(() => div.querySelector('.ticl-block'));

    let block = div.querySelector('.ticl-block') as HTMLDivElement;
    // mouse down
    SimulateEvent.simulate(document.querySelector('.ticl-block-head'), 'pointerdown', {
      clientX: 0,
      clientY: 0,
    });

    await shouldHappen(() => block.classList.contains('ticl-block-selected'));

    // mouse move to drag
    assert.equal(block.offsetLeft, 123);
    assert.equal(block.offsetTop, 234);
    SimulateEvent.simulate(document.body, 'mousemove', {
      clientX: 100,
      clientY: 100
    });
    await shouldHappen(() => block.offsetLeft === 223);
    assert.equal(block.offsetTop, 334);

    // mouse up to stop dragging
    SimulateEvent.simulate(document.body, 'mouseup');

    await shouldHappen(() => arrayEqual(job.queryValue('add.@b-xyw'), [223, 334, 345]));

    // mouse move no longer drag block
    SimulateEvent.simulate(document.body, 'mousemove', {
      clientX: 200,
      clientY: 200
    });
    await shouldReject(shouldHappen(() => block.offsetLeft !== 223));

    Root.instance.deleteValue('BlockStage2');
  });

  it('drag block size', async function () {
    let job = Root.instance.addJob('BlockStage3');
    job.load({
      add: {
        '#is': 'add',
        '@b-xyw': [123, 234, 345],
        '@b-p': ['0', '1', 'output']
      }
    });

    let [server, client] = makeLocalConnection(Root.instance);

    let [component, div] = loadTemplate(
      <BlockStage conn={client} basePath="BlockStage3"
                  style={{width: '800px', height: '800px'}}/>, 'editor');

    await shouldHappen(() => div.querySelector('.ticl-block'));

    let block = div.querySelector('.ticl-block') as HTMLDivElement;
    await shouldHappen(() => (block.offsetWidth === 345));
    // mouse down
    SimulateEvent.simulate(document.querySelector('.ticl-width-drag'), 'pointerdown', {
      clientX: 0,
      clientY: 0,
    });

    // mouse move to drag
    SimulateEvent.simulate(document.body, 'mousemove', {
      clientX: 100,
      clientY: 100
    });
    await shouldHappen(() => (block.offsetWidth === 445));

    await shouldHappen(() => arrayEqual(job.queryValue('add.@b-xyw'), [123, 234, 445]));

    // mouse up to stop dragging
    SimulateEvent.simulate(document.body, 'mouseup');

    Root.instance.deleteValue('BlockStage3');
  });


  it('min block and wire', async function () {

    let job = Root.instance.addJob('BlockStage4');
    job.load({
      add: {
        '#is': 'add',
        '0': 1,
        '@b-xyw': [100, 100, 150],
        '@b-p': ['0', '1']
      },
      subtract: {
        '#is': 'subtract',
        '~0': '##.add.0',
        '@b-xyw': [200, 200, 150],
        '@b-p': ['0']
      },
    });

    let [server, client] = makeLocalConnection(Root.instance);

    let [component, div] = loadTemplate(
      <BlockStage conn={client} basePath="BlockStage4"
                  style={{width: '800px', height: '800px'}}/>, 'editor');

    // wait for the wire
    await shouldHappen(() => div.querySelector('svg'));

    let addBlock = querySingle("//div.ticl-block-head[text()='add']/..", div);
    assert.equal(addBlock.offsetWidth, 150);

    let wire = div.querySelector('svg');

    // mousedown to select
    SimulateEvent.simulate(addBlock.querySelector('.ticl-block-head'), 'pointerdown');
    SimulateEvent.simulate(document.body, 'mouseup');
    // wire should have z index
    await shouldHappen(() => wire.style.zIndex === '100');

    // minimize the block
    SimulateEvent.simulate(addBlock.querySelector('.ticl-block-head'), 'dblclick');
    await shouldHappen(() => addBlock.offsetWidth === 24);
    assert.equal(addBlock.offsetHeight, 24);

    // wrie instance should be reused
    assert.equal(div.querySelector('svg'), wire);

    // click the other block
    SimulateEvent.simulate(querySingle("//div.ticl-block-head[text()='subtract']", div), 'pointerdown');
    // addBlock is no longer selected
    await shouldHappen(() => !addBlock.classList.contains('ticl-block-selected'));
    // since subtract block is now selected, wire should still have zindex
    assert.equal(wire.style.zIndex, '100');

    // expand block
    SimulateEvent.simulate(addBlock.querySelector('.ticl-block-head'), 'dblclick');
    await shouldHappen(() => addBlock.offsetWidth === 150);

    // wire should disappear when source not in stage
    job.queryProperty('subtract.0').setBinding('##.unknown');
    await shouldHappen(() => div.querySelector('svg') == null);

    // wire should be back when binding is set again
    job.queryProperty('subtract.0').setBinding('##.add.1');
    await shouldHappen(() => div.querySelector('svg'));

    // wire should disappear when unbound
    job.queryProperty('subtract.0').setValue(1);
    await shouldHappen(() => div.querySelector('svg') == null);


    Root.instance.deleteValue('BlockStage4');
  });

  it('rect select', async function () {

    let job = Root.instance.addJob('BlockStage5');
    job.load({
      add: {
        '#is': 'add',
        '@b-xyw': [100, 100, 100],
        '@b-p': ['0']
      },
      subtract: {
        '#is': 'subtract',
        '@b-xyw': [200, 200, 100],
        '@b-p': ['0']
      },
    });

    let [server, client] = makeLocalConnection(Root.instance);

    let selectedKeys: string[];

    function onSelect(keys: string[]) {
      selectedKeys = keys;
    }

    let [component, div] = loadTemplate(
      <BlockStage conn={client} basePath="BlockStage5" onSelect={onSelect}
                  style={{width: '800px', height: '800px'}}/>, 'editor');

    // wait for the field
    await shouldHappen(() => div.querySelector('.ticl-field'));
    // background
    let rectBg = div.querySelector('.ticl-full');

    // select all
    SimulateEvent.simulate(rectBg, 'pointerdown', {
      clientX: 90,
      clientY: 90
    });
    SimulateEvent.simulate(rectBg, 'mouseup', {
      clientX: 310,
      clientY: 310
    });

    // both block are selected
    await shouldHappen(() => div.querySelectorAll('.ticl-block-selected').length === 2);
    assert.sameMembers(selectedKeys, ['BlockStage5.add', 'BlockStage5.subtract']);

    // select all
    SimulateEvent.simulate(rectBg, 'pointerdown', {
      clientX: 210,
      clientY: 210
    });
    SimulateEvent.simulate(rectBg, 'mouseup', {
      clientX: 90,
      clientY: 90
    });

    // one block selected
    await shouldHappen(() => div.querySelectorAll('.ticl-block-selected').length === 1);
    assert.sameMembers(selectedKeys, ['BlockStage5.add']);

    // select none
    SimulateEvent.simulate(rectBg, 'pointerdown', {
      clientX: 90,
      clientY: 90
    });
    SimulateEvent.simulate(rectBg, 'mouseup', {
      clientX: 91,
      clientY: 89
    });
    // one block selected
    await shouldHappen(() => div.querySelectorAll('.ticl-block-selected').length === 0);
    assert.isEmpty(selectedKeys);

    Root.instance.deleteValue('BlockStage5');
  });

});
