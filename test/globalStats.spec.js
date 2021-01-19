'use strict';

const globalStats = require('../lib/globalStats');
const expect = require('chai').expect;
const stream = require('stream');
const sinon = require('sinon');
const utils = require('../lib/utils');

describe('globalStats', () => {
  it('should construct appropriately', () => {
    expect(globalStats._rawStream).to.be.instanceof(stream.Readable);
    expect(globalStats._rawStream._read).to.be.a('function');
    expect(globalStats._hystrixStream).to.be.instanceof(stream.Transform);
    expect(globalStats._hystrixStream._transform).to.be.a('function');
  });

  it('instanceCount() should return instance count', () => {
    globalStats._brakesInstances.push({});
    expect(globalStats.instanceCount()).to.equal(1);
    globalStats._brakesInstances.pop();
  });

  it('register() should allow registration', () => {
    const instance = {
      on: sinon.spy()
    };
    globalStats.register(instance);
    expect(globalStats._brakesInstances[0]).to.equal(instance);
    expect(instance.on.calledOnce).to.equal(true);
    expect(instance.on.firstCall.args[0]).to.equal('snapshot');
    expect(instance.on.firstCall.args[1]).to.be.a('function');
    globalStats._brakesInstances.pop();
  });

  it('deregister() should allow deregistration', () => {
    const instance = {
      removeListener: sinon.spy()
    };
    globalStats._brakesInstances.push(instance);
    globalStats.deregister(instance);
    expect(globalStats._brakesInstances.length).to.equal(0);
    expect(instance.removeListener.calledOnce).to.equal(true);
    expect(instance.removeListener.firstCall.args[0]).to.equal('snapshot');
    expect(instance.removeListener.firstCall.args[1]).to.be.a('function');
  });

  it('_globalListener() should skip if not object', () => {
    const data = '';
    const stub = sinon.stub(globalStats._rawStream, 'push').callsFake(() => true);
    globalStats._globalListener(data);
    expect(stub.calledOnce).to.equal(false);
    globalStats._rawStream.push.restore();
  });

  it('_globalListener() should push to rawStream', () => {
    const data = {
      foo: 'bar'
    };
    const stub = sinon.stub(globalStats._rawStream, 'push').callsFake(() => true);
    globalStats._globalListener(data);
    expect(stub.calledOnce).to.equal(true);
    expect(stub.firstCall.args[0]).to.equal(JSON.stringify(data));
    globalStats._rawStream.push.restore();
  });

  it('_globalListener() should push to rawStream if paused but readableFlowing', () => {
    const data = {
      foo: 'bar'
    };
    globalStats._rawStream.readableFlowing = true;
    const stub = sinon.stub(globalStats._rawStream, 'push').callsFake(() => true);
    const pausedStub = sinon.stub(globalStats._rawStream, 'isPaused').callsFake(() => true);
    globalStats._globalListener(data);
    expect(stub.calledOnce).to.equal(true);
    expect(pausedStub.calledOnce).to.equal(true);
    expect(stub.firstCall.args[0]).to.equal(JSON.stringify(data));
    globalStats._rawStream.push.restore();
    globalStats._rawStream.isPaused.restore();
  });

  it('_transformToHysterix() should transform to hysterix', done => {
    const mock = {
      foo: 'bar'
    };
    const stub = sinon.stub(utils, 'mapToHystrixJson').callsFake(data => data);
    globalStats._transformToHysterix(JSON.stringify(mock), null, (err, data) => {
      expect(stub.calledOnce).to.equal(true);
      expect(data).to.equal(`data: ${JSON.stringify(mock)}\n\n`);
      utils.mapToHystrixJson.restore();
      done();
    });
  });

  it('getRawStream() should return raw stream', () => {
    expect(globalStats.getRawStream()).to.equal(globalStats._rawStream);
  });

  it('getHystrixStream() should return hysterixStream stream', () => {
    expect(globalStats.getHystrixStream()).to.equal(globalStats._hystrixStream);
  });
});
