import {assert} from "chai";
import {Job, Root} from "../Block";
import {BlockDeepProxy, BlockProxy} from "../BlockProxy";

describe("BlockProxy", function () {

  it('deep proxy', function () {
    let job = new Job();
    job.setValue('v1', 1);

    let bBlock = job.createBlock('b');
    bBlock.setValue('v2', 2);
    bBlock.setValue('v3', 3);
    bBlock.deleteValue('v3');
    bBlock.setValue('@v', '0'); // block attribute should not be iterated
    bBlock.createHelperBlock('v4').output(4); // property helper should not be iterated
    let b: any = new Proxy(bBlock, BlockDeepProxy);

    assert.equal(b['###'].v1, 1);
    assert.equal(b.v2, 2);
    assert.equal(b['@v'], 0);
    assert.equal(b['@notExist'], undefined);
    assert.equal(('v3' in b), false);
    assert.equal(Object.prototype.hasOwnProperty.call(b, 'v4'), true);
    assert.equal(Object.isExtensible(b), true);

    let keys = [];
    for (let key in b) {
      keys.push(key);
    }
    keys.sort();
    assert.deepEqual(keys, ['v2', 'v4']);

    let keys2 = Object.keys(b);
    keys2.sort();
    assert.deepEqual(keys2, ['v2', 'v4']);

    job.deleteValue('b');

    // block is destroyed
    // Proxy should act like an empty Object

    let keepStrictMode = Root.instance._strictMode;
    Root.instance._strictMode = false;

    assert.equal(b['###'], undefined, 'destroyed block should clear proxy');
    b.v2 = 22;
    assert.equal(b.v2, undefined);
    assert.deepEqual(Object.keys(b), []);

    Root.instance._strictMode = keepStrictMode;
  });

  it('shallow proxy', function () {
    let job = new Job();
    job.setValue('v1', 1);

    let bBlock = job.createBlock('b');
    bBlock.setValue('v2', 2);
    bBlock.setValue('v3', 3);
    bBlock.deleteValue('v3');
    bBlock.setValue('@v', '0'); // block attribute should not be iterated
    bBlock.createHelperBlock('v4').output(4); // property helper should not be iterated
    let b: any = new Proxy(bBlock, BlockProxy);

    assert.equal(b['###'], job);
    assert.equal(b.v2, 2);
    assert.equal(b['@v'], 0);
    assert.equal(b['@notExist'], undefined);
    assert.equal(('v3' in b), false);
    assert.equal(Object.prototype.hasOwnProperty.call(b, 'v4'), true);
    assert.equal(Object.isExtensible(b), true);

    let keys = [];
    for (let key in b) {
      keys.push(key);
    }
    keys.sort();
    assert.deepEqual(keys, ['v2', 'v4']);

    let keys2 = Object.keys(b);
    keys2.sort();
    assert.deepEqual(keys2, ['v2', 'v4']);

    job.deleteValue('b');

    // block is destroyed
    // Proxy should act like an empty Object

    let keepStrictMode = Root.instance._strictMode;
    Root.instance._strictMode = false;

    assert.equal(b['###'], undefined, 'destroyed block should clear proxy');
    b.v2 = 22;
    assert.equal(b.v2, undefined);
    assert.deepEqual(Object.keys(b), []);

    Root.instance._strictMode = keepStrictMode;
  });
});
