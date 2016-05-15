'use strict';

const Brakes = require('../lib/Brakes');
const expect = require('chai').expect;
const EventEmitter = require('events').EventEmitter;
const sinon = require('sinon');
const TimeOutError = require('../lib/TimeOutError');
const CircuitBrokenError = require('../lib/CircuitBrokenError');

const defaultOptions = {
  bucketSpan: 1000,
  bucketNum: 60,
  name: 'defaultBrake',
  group: 'defaultBrakeGroup',
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
  it('Should be an instance of EventEmitter', () => {
    const brake = new Brakes(noop);
    expect(brake).to.be.instanceof(EventEmitter);
  });
  it('Should be instantiated with default options', () => {
    const brake = new Brakes(noop);
    // const snapshotSpy = sinon.spy(brake._stats, 'startSnapshots');
    // const statsSpy = sinon.spy(brake, '_startStatsCheck');
    // expect(snapshotSpy.calledOnce).to.equal(true);
    // expect(statsSpy.calledOnce).to.equal(true);
    // expect(brake._stats).to.be.instanceof(Stats);
    expect(brake._opts).to.deep.equal(defaultOptions);
  });
  it('Should promisify the service func', () => {
    const brake = new Brakes(noop);
    return brake._serviceCall('test').then((result) => {
      expect(result).to.equal('test');
    });
  });
  it('Should promisify and reject service func', () => {
    const brake = new Brakes(noop);
    return brake._serviceCall(null, 'err').then(null, (err) => {
      expect(err).to.be.instanceof(Error);
      expect(err.message).to.equal('err');
    });
  });
  it('Should accept a promise', () => {
    const brake = new Brakes(nopr);
    return brake._serviceCall('test').then((result) => {
      expect(result).to.equal('test');
    });
  });
  it('Should reject a promise', () => {
    const brake = new Brakes(nopr);
    return brake._serviceCall(null, 'err').then(null, (err) => {
      expect(err).to.be.instanceof(Error);
      expect(err.message).to.equal('err');
    });
  });
  it('Throw an error if not passed a function', () => {
    expect(() => {
      const brake = new Brakes();
      brake.test();
    }).to.throw();
  });
  it('Should be instantiated with a name', () => {
    const overrides = {
      name: 'allYourNameAreBelongToUs'
    };
    const brake = new Brakes(noop, overrides);
    expect(brake.name).to.deep.equal(overrides.name);
  });
  it('Should be instantiated with a group', () => {
    const overrides = {
      group: 'allYourGroupAreBelongToUs'
    };
    const brake = new Brakes(noop, overrides);
    expect(brake.group).to.deep.equal(overrides.group);
  });
  it('Should be instantiated with override options', () => {
    const overrides = {
      bucketSpan: 10001,
      bucketNum: 601,
      circuitDuration: 300001,
      statInterval: 1,
      name: 'PUT:/path',
      group: 'fakeGroup',
      startDelay: 50010,
      threshold: 0.3,
      timeout: 100
    };
    const brake = new Brakes(noop, overrides);
    expect(brake._opts).to.deep.equal(overrides);
  });
  it('Should Resolve a service call and trigger event', () => {
    const brake = new Brakes(nopr);
    const spy = sinon.spy(() => {});
    brake.on('success', spy);
    return brake.exec('foo').then(result => {
      expect(result).to.equal('foo');
      expect(spy.calledOnce).to.equal(true);
    });
  });
  it('Should Reject a service call and trigger event', () => {
    const brake = new Brakes(noop);
    const spy = sinon.spy(() => {});
    brake.on('failure', spy);
    return brake.exec(null, 'err').then(null, err => {
      expect(err).to.be.instanceof(Error);
      expect(err.message).to.equal('err');
      expect(spy.calledOnce).to.equal(true);
    });
  });
  it('Should timeout a service call and trigger event', () => {
    const brake = new Brakes(slowpr, {
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
    const brake = new Brakes(nopr);
    brake._circuitOpen = true;
    return brake.exec(null, 'err').then(null, err => {
      expect(err).to.be.instanceof(CircuitBrokenError);
    });
  });
  it('Should call fallback if circuit is broken', () => {
    const brake = new Brakes(nopr);
    brake.fallback(fbpr);
    brake._circuitOpen = true;
    return brake.exec('test').then(result => {
      expect(result).to.equal('test');
    });
  });
  it('Fallback should cascade fail', () => {
    const brake = new Brakes(nopr);
    brake.fallback(noop);
    return brake.exec(null, 'err').then(null, err => {
      expect(err).to.be.instanceof(Error);
      expect(err.message).to.equal('err');
    });
  });
  it('Fallback should succeed', () => {
    const brake = new Brakes(nopr);
    brake.fallback(fbpr);
    return brake.exec(null, 'thisShouldFailFirstCall').then(result => {
      expect(result).to.equal('thisShouldFailFirstCall');
    });
  });
  it('_open should open', (done) => {
    const brake = new Brakes(nopr, {
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
    const brake = new Brakes(nopr);
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
    const brake = new Brakes(nopr, {
      startDelay: 1
    });
    brake._stopStatsCheck();
    setTimeout(() => {
      expect(brake._checkingStatus).to.equal(true);
      done();
    }, 5);
  });
  it('_stopStatsCheck should set flag', () => {
    const brake = new Brakes(nopr);
    brake._stopStatsCheck();
    expect(brake._checkingStatus).to.equal(false);
  });
  it('_checkStats should not check when status flag is false', () => {
    const brake = new Brakes(nopr);
    const spy = sinon.spy(brake, '_close');
    brake._checkStats();
    expect(spy.calledOnce).to.equal(false);
  });
  it('_checkStats should not check when total is 0', () => {
    const brake = new Brakes(nopr);
    brake._checkingStatus = true;
    const spy = sinon.spy(brake, '_close');
    brake._checkStats({
      total: 0
    });
    expect(spy.calledOnce).to.equal(false);
  });
  it('_checkStats should not check when circuit is broken is 0', () => {
    const brake = new Brakes(nopr);
    brake._checkingStatus = true;
    brake._closed = true;
    const spy = sinon.spy(brake, '_close');
    brake._checkStats({
      total: 1
    });
    expect(spy.calledOnce).to.equal(false);
  });
  it('_checkStats should check and not close', () => {
    const brake = new Brakes(nopr);
    const spy = sinon.spy(brake, '_close');
    brake._checkStats({
      successful: 10,
      total: 10
    });
    expect(spy.calledOnce).to.equal(false);
  });
  it('_checkStats should check and not close', () => {
    const brake = new Brakes(nopr);
    brake._checkingStatus = true;
    const spy = sinon.spy(brake, '_open');
    brake._checkStats({
      successful: 1,
      total: 10
    });
    expect(spy.calledOnce).to.equal(true);
  });
});
