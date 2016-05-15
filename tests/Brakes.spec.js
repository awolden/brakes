'use strict';

const Brakes = require('../lib/Brakes');
const globalStats = require('../lib/globalStats');
const expect = require('chai').expect;
const EventEmitter = require('events').EventEmitter;
const sinon = require('sinon');
const TimeOutError = require('../lib/TimeOutError');
const CircuitBrokenError = require('../lib/CircuitBrokenError');

let brake;

const defaultOptions = {
  bucketSpan: 1000,
  bucketNum: 60,
  name: 'defaultBrake',
  group: 'defaultBrakeGroup',
  registerGlobal: true,
  circuitDuration: 30000,
  statInterval: 1200,
  startDelay: 5000,
  threshold: 0.5,
  timeout: 15000
};

const noop = function noop(foo, err, cb) {
  if (typeof err === 'function') {
    cb = err;
    err = null;
  }
  cb(err ? new Error(err) : null, foo);
};
const nopr = function nopr(foo, err) {
  return new Promise((resolve, reject) => {
    if (err) reject(new Error(err));
    else resolve(foo);
  });
};
const slowpr = function slowpr(foo) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(foo);
    }, 50);
  });
};
const fbpr = function fallback(foo, err) {
  return new Promise((resolve) => {
    resolve(foo || err);
  });
};
describe('Brakes Class', () => {
  afterEach(() => {
    if (brake instanceof Brakes) {
      brake.destroy();
      brake = undefined;
    }
  });
  it('Should be an instance of EventEmitter', () => {
    brake = new Brakes(noop);
    expect(brake).to.be.instanceof(EventEmitter);
  });
  it('Should be instantiated with default options', () => {
    brake = new Brakes(noop);
    // const snapshotSpy = sinon.spy(brake._stats, 'startSnapshots');
    // const statsSpy = sinon.spy(brake, '_startStatsCheck');
    // expect(snapshotSpy.calledOnce).to.equal(true);
    // expect(statsSpy.calledOnce).to.equal(true);
    // expect(brake._stats).to.be.instanceof(Stats);
    expect(brake._opts).to.deep.equal(defaultOptions);
  });
  it('Should promisify the service func', () => {
    brake = new Brakes(noop);
    return brake._serviceCall('test').then((result) => {
      expect(result).to.equal('test');
    });
  });
  it('Should promisify and reject service func', () => {
    brake = new Brakes(noop);
    return brake._serviceCall(null, 'err').then(null, (err) => {
      expect(err).to.be.instanceof(Error);
      expect(err.message).to.equal('err');
    });
  });
  it('Should accept a promise', () => {
    brake = new Brakes(nopr);
    return brake._serviceCall('test').then((result) => {
      expect(result).to.equal('test');
    });
  });
  it('Should reject a promise', () => {
    brake = new Brakes(nopr);
    return brake._serviceCall(null, 'err').then(null, (err) => {
      expect(err).to.be.instanceof(Error);
      expect(err.message).to.equal('err');
    });
  });
  it('Throw an error if not passed a function', () => {
    expect(() => {
      brake = new Brakes();
      brake.test();
    }).to.throw();
  });
  it('Should be instantiated with a name', () => {
    const overrides = {
      name: 'allYourNameAreBelongToUs'
    };
    brake = new Brakes(noop, overrides);
    expect(brake.name).to.deep.equal(overrides.name);
  });
  it('Should be instantiated with a group', () => {
    const overrides = {
      group: 'allYourGroupAreBelongToUs'
    };
    brake = new Brakes(noop, overrides);
    expect(brake.group).to.deep.equal(overrides.group);
  });
  it('Should be instantiated with override options', () => {
    const overrides = {
      bucketSpan: 10001,
      bucketNum: 601,
      circuitDuration: 300001,
      statInterval: 1,
      registerGlobal: false,
      name: 'PUT:/path',
      group: 'fakeGroup',
      startDelay: 50010,
      threshold: 0.3,
      timeout: 100
    };
    brake = new Brakes(noop, overrides);
    expect(brake._opts).to.deep.equal(overrides);
  });
  it('Should Resolve a service call and trigger event', () => {
    brake = new Brakes(nopr);
    const spy = sinon.spy(() => {});
    brake.on('success', spy);
    return brake.exec('foo').then(result => {
      expect(result).to.equal('foo');
      expect(spy.calledOnce).to.equal(true);
    });
  });
  it('Should Reject a service call and trigger event', () => {
    brake = new Brakes(noop);
    const spy = sinon.spy(() => {});
    brake.on('failure', spy);
    return brake.exec(null, 'err').then(null, err => {
      expect(err).to.be.instanceof(Error);
      expect(err.message).to.equal('err');
      expect(spy.calledOnce).to.equal(true);
    });
  });
  it('Should timeout a service call and trigger event', () => {
    brake = new Brakes(slowpr, {
      timeout: 1
    });
    const spy = sinon.spy(() => {});
    brake.on('timeout', spy);
    return brake.exec(null, 'err').then(null, err => {
      expect(err).to.be.instanceof(TimeOutError);
      expect(spy.calledOnce).to.equal(true);
    });
  });
  it('Should auto reject if circuit is broken', () => {
    brake = new Brakes(nopr);
    brake._circuitOpen = true;
    return brake.exec(null, 'err').then(null, err => {
      expect(err).to.be.instanceof(CircuitBrokenError);
    });
  });
  it('Should call fallback if circuit is broken', () => {
    brake = new Brakes(nopr);
    brake.fallback(fbpr);
    brake._circuitOpen = true;
    return brake.exec('test').then(result => {
      expect(result).to.equal('test');
    });
  });
  it('Fallback should cascade fail', () => {
    brake = new Brakes(nopr);
    brake.fallback(noop);
    return brake.exec(null, 'err').then(null, err => {
      expect(err).to.be.instanceof(Error);
      expect(err.message).to.equal('err');
    });
  });
  it('Fallback should succeed', () => {
    brake = new Brakes(nopr);
    brake.fallback(fbpr);
    return brake.exec(null, 'thisShouldFailFirstCall').then(result => {
      expect(result).to.equal('thisShouldFailFirstCall');
    });
  });
  it('_open should open', (done) => {
    brake = new Brakes(nopr, {
      circuitDuration: 10
    });

    const statsCheckSpy = sinon.spy(brake, '_stopStatsCheck');
    const statsResetSpy = sinon.spy(brake._stats, 'reset');
    const openSpy = sinon.spy(brake, '_close');
    const eventSpy = sinon.spy(() => {});
    brake.on('circuitOpen', eventSpy);

    // test if check is made properly
    brake._circuitOpen = true;
    brake._open();
    expect(eventSpy.calledOnce).to.equal(false);

    // test actual opening
    brake._circuitOpen = false;
    brake._open();

    expect(brake._circuitOpen).to.equal(true);
    expect(statsCheckSpy.calledOnce).to.equal(true);
    expect(eventSpy.calledOnce).to.equal(true);

    setTimeout(() => {
      expect(statsResetSpy.calledOnce).to.equal(true);
      expect(openSpy.calledOnce).to.equal(true);
      done();
    }, 20);

  });
  it('_close should close', () => {
    brake = new Brakes(nopr);
    brake._circuitOpened = true;
    const funcSpy = sinon.spy(brake, '_startStatsCheck');
    const eventSpy = sinon.spy(() => {});
    brake.on('circuitClosed', eventSpy);
    brake._close();
    expect(brake._circuitOpen).to.equal(false);
    expect(funcSpy.calledOnce).to.equal(true);
    expect(eventSpy.calledOnce).to.equal(true);
  });
  it('_startStatsCheck should set flag after delay', (done) => {
    brake = new Brakes(nopr, {
      startDelay: 1
    });
    brake._stopStatsCheck();
    setTimeout(() => {
      expect(brake._checkingStatus).to.equal(true);
      done();
    }, 5);
  });
  it('_snapshotHandler should transform stats object and emit', (done) => {
    brake = new Brakes(nopr, {
      name: 'brake1',
      group: 'brakeGroup1',
      registerGlobal: false
    });
    const eventSpy = sinon.spy(() => {});
    brake.on('snapshot', eventSpy);
    brake._snapshotHandler({
      foo: 'bar'
    });
    setTimeout(() => {
      expect(eventSpy.calledOnce).to.equal(true);
      const statsObj = eventSpy.firstCall.args[0];
      expect(statsObj.name).to.equal('brake1');
      expect(statsObj.group).to.equal('brakeGroup1');
      expect(statsObj.time).to.be.a('number');
      expect(statsObj.threshold).to.equal(defaultOptions.threshold);
      expect(statsObj.circuitDuration).to.equal(defaultOptions.circuitDuration);
      expect(statsObj.stats).to.deep.equal({
        foo: 'bar'
      });
      done();
    }, 5);
  });
  it('_stopStatsCheck should set flag', () => {
    brake = new Brakes(nopr);
    brake._stopStatsCheck();
    expect(brake._checkingStatus).to.equal(false);
  });
  it('destroy() should remove all references', () => {
    brake = new Brakes(nopr);

    // first test that we are handling all appropriate events
    const expectedEvents = ['success', 'timeout', 'failure', 'snapshot'];
    const actualEvents = Object.keys(brake._events);
    expect(actualEvents).to.have.members(expectedEvents);
    expect(Object.keys(brake._events).length).to.equal(expectedEvents.length);

    const deregisterStub = sinon.stub(globalStats, 'deregister');
    const removeEventStub = sinon.stub(brake, 'removeAllListeners', () => true);
    brake.destroy();
    expect(deregisterStub.calledOnce).to.equal(true);
    expect(removeEventStub.callCount).to.equal(actualEvents.length);
    brake.removeAllListeners.restore();
    globalStats.deregister.restore();
  });
  it('getGlobalStats should return instance of globalStats', () => {
    brake = new Brakes(nopr);
    expect(brake.getGlobalStats()).to.equal(globalStats);
    expect(Brakes.getGlobalStats()).to.equal(globalStats);
  });
  it('_checkStats should not check when status flag is false', () => {
    brake = new Brakes(nopr);
    const spy = sinon.spy(brake, '_close');
    brake._checkStats();
    expect(spy.calledOnce).to.equal(false);
  });
  it('_checkStats should not check when total is 0', () => {
    brake = new Brakes(nopr);
    brake._checkingStatus = true;
    const spy = sinon.spy(brake, '_close');
    brake._checkStats({
      total: 0
    });
    expect(spy.calledOnce).to.equal(false);
  });
  it('_checkStats should not check when circuit is broken is 0', () => {
    brake = new Brakes(nopr);
    brake._checkingStatus = true;
    brake._closed = true;
    const spy = sinon.spy(brake, '_close');
    brake._checkStats({
      total: 1
    });
    expect(spy.calledOnce).to.equal(false);
  });
  it('_checkStats should check and not close', () => {
    brake = new Brakes(nopr);
    const spy = sinon.spy(brake, '_close');
    brake._checkStats({
      successful: 10,
      total: 10
    });
    expect(spy.calledOnce).to.equal(false);
  });
  it('_checkStats should check and not close', () => {
    brake = new Brakes(nopr);
    brake._checkingStatus = true;
    const spy = sinon.spy(brake, '_open');
    brake._checkStats({
      successful: 1,
      total: 10
    });
    expect(spy.calledOnce).to.equal(true);
  });
});
