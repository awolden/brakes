'use strict';

const Stats = require('../lib/Stats');
const chai = require('chai');
chai.use(require('chai-things'));
const expect = chai.expect;
const EventEmitter = require('events').EventEmitter;
const Bucket = require('../lib/Bucket');
const sinon = require('sinon');

const defaultOptions = {
  bucketSpan: 1000,
  bucketNum: 60,
  percentiles: [0.0, 0.25, 0.50, 0.75, 0.90, 0.95, 0.99, 0.995, 1],
  statInterval: 1200
};

describe('Stats Class', () => {
  it('Should be an instance of EventEmitter', () => {
    const stats = new Stats();
    expect(stats).to.be.instanceof(EventEmitter);
  });
  it('Should be instantiated with default options', () => {
    const stats = new Stats();
    expect(stats._opts).to.deep.equal(defaultOptions);
  });
  it('Should be instantiated with override options', () => {
    const overrides = {
      bucketSpan: 2000,
      bucketNum: 30,
      percentiles: [0.50],
      statInterval: 2400
    };
    const stats = new Stats(overrides);
    expect(stats._opts).to.deep.equal(overrides);
  });
  it('Should be instantiated with the appropriate number of buckets', () => {
    const stats = new Stats();
    expect(stats._buckets.length).to.equal(defaultOptions.bucketNum);
    expect(stats._buckets).all.to.be.instanceof(Bucket);
  });
  it('Should assign active position', () => {
    const stats = new Stats();
    expect(stats._activePosition).to.equal(stats._buckets.length - 1);
  });
  it('Should assign active bucket', () => {
    const stats = new Stats();
    expect(stats._activeBucket).to.equal(stats._buckets[stats._buckets.length - 1]);
  });
  it('Should start bucket spinning automatically', (done) => {
    const stats = new Stats({
      bucketSpan: 10
    });
    const spy = sinon.spy(stats, '_shiftAndPush');
    setTimeout(() => {
      expect(spy.calledOnce).to.equal(true);
      done();
    }, 15);
    expect(stats._spinningInterval).to.be.a('object');
  });
  it('Should stop bucket spinning', () => {
    const stats = new Stats();
    stats._stopBucketSpinning();
    expect(stats._spinningInterval).to.equal(undefined);
    // test 2nd call
    expect(stats._stopBucketSpinning()).to.equal(false);
  });
  it('Should start stats snapshotting', (done) => {
    const stats = new Stats();
    stats.startSnapshots(10);
    const spy = sinon.spy(stats, '_snapshot');
    setTimeout(() => {
      expect(spy.calledOnce).to.equal(true);
      done();
    }, 15);
    expect(stats._snapshotInterval).to.be.a('object');
  });
  it('Should stop stats snapshotting', () => {
    const stats = new Stats();
    stats.startSnapshots();
    stats.stopSnapshots();
    expect(stats._snapshotInterval).to.equal(undefined);
    // test 2nd call
    expect(stats.stopSnapshots()).to.equal(false);
  });
  it('Should calculate percentile', () => {
    const stats = new Stats();
    const a = [1, 2, 3, 4, 5];
    expect(stats._calculatePercentile(0, a)).to.equal(1);
    expect(stats._calculatePercentile(0.25, a)).to.equal(2);
    expect(stats._calculatePercentile(0.5, a)).to.equal(3);
    expect(stats._calculatePercentile(0.75, a)).to.equal(4);
    expect(stats._calculatePercentile(1, a)).to.equal(5);
  });
  it('Generate Blank Stats', () => {
    const stats = new Stats();
    const buckets = [null, null];
    expect(stats._generateStats(buckets)).to.deep.equal({
      total: 0,
      failed: 0,
      latencyMean: 0,
      shortCircuited: 0,
      successful: 0,
      timedOut: 0,
      percentiles: {
        0: 0,
        1: 0,
        0.25: 0,
        0.5: 0,
        0.75: 0,
        0.9: 0,
        0.95: 0,
        0.99: 0,
        0.995: 0
      }
    });
  });
  it('Generate Complete Stats', () => {
    const stats = new Stats();
    const buckets = [
      new Bucket(),
      new Bucket()
    ];
    buckets[0].failure(145);
    buckets[1].failure(234);
    buckets[0].success(231);
    buckets[1].success(1234);
    buckets[0].timeout(432);
    buckets[1].timeout(12);
    expect(stats._generateStats(buckets, true)).to.deep.equal({
      total: 6,
      failed: 2,
      successful: 2,
      shortCircuited: 0,
      latencyMean: 381,
      timedOut: 2,
      percentiles: {
        0: 12,
        1: 1234,
        0.25: 145,
        0.5: 231,
        0.75: 432,
        0.9: 1234,
        0.95: 1234,
        0.99: 1234,
        0.995: 1234
      }
    });
    expect(stats._totals).to.deep.equal({
      total: 6,
      failed: 2,
      successful: 2,
      shortCircuited: 0,
      latencyMean: 381,
      timedOut: 2,
      percentiles: {
        0: 12,
        1: 1234,
        0.25: 145,
        0.5: 231,
        0.75: 432,
        0.9: 1234,
        0.95: 1234,
        0.99: 1234,
        0.995: 1234
      }
    });
  });
  it('_update should emit an event', () => {
    const stats = new Stats();
    const spy = sinon.spy(() => {});
    stats.on('update', spy);
    stats._update();
    expect(spy.calledOnce).to.equal(true);
    expect(spy.firstCall.args[0]).to.deep.equal({
      total: 0,
      failed: 0,
      successful: 0,
      shortCircuited: 0,
      latencyMean: 0,
      timedOut: 0,
      percentiles: {
        0: 0,
        1: 0,
        0.25: 0,
        0.5: 0,
        0.75: 0,
        0.9: 0,
        0.95: 0,
        0.99: 0,
        0.995: 0
      }
    });
  });
  it('Should increment failure and call update', () => {
    const stats = new Stats();
    const spy = sinon.spy(() => {});
    stats.on('update', spy);
    stats.failure(100);
    expect(spy.calledOnce).to.equal(true);
    expect(spy.firstCall.args[0]).to.deep.equal({
      total: 1,
      failed: 1,
      successful: 0,
      shortCircuited: 0,
      latencyMean: 0,
      timedOut: 0,
      percentiles: {
        0: 0,
        1: 0,
        0.25: 0,
        0.5: 0,
        0.75: 0,
        0.9: 0,
        0.95: 0,
        0.99: 0,
        0.995: 0
      }
    });
  });
  it('Should increment shortCircuit', () => {
    const stats = new Stats();
    const spy = sinon.spy(() => {});
    stats.on('update', spy);
    stats.shortCircuit();
    expect(spy.calledOnce).to.equal(true);
    expect(spy.firstCall.args[0]).to.deep.equal({
      total: 0,
      failed: 0,
      successful: 0,
      shortCircuited: 1,
      latencyMean: 0,
      timedOut: 0,
      percentiles: {
        0: 0,
        1: 0,
        0.25: 0,
        0.5: 0,
        0.75: 0,
        0.9: 0,
        0.95: 0,
        0.99: 0,
        0.995: 0
      }
    });
  });
  it('Should increment success and call update', () => {
    const stats = new Stats();
    const spy = sinon.spy(() => {});
    stats.on('update', spy);
    stats.success(100);
    expect(spy.calledOnce).to.equal(true);
    expect(spy.firstCall.args[0]).to.deep.equal({
      total: 1,
      failed: 0,
      successful: 1,
      shortCircuited: 0,
      latencyMean: 0,
      timedOut: 0,
      percentiles: {
        0: 0,
        1: 0,
        0.25: 0,
        0.5: 0,
        0.75: 0,
        0.9: 0,
        0.95: 0,
        0.99: 0,
        0.995: 0
      }
    });
  });
  it('Should increment timedOut and call update', () => {
    const stats = new Stats();
    const spy = sinon.spy(() => {});
    stats.on('update', spy);
    stats.timeout(100);
    expect(spy.calledOnce).to.equal(true);
    expect(spy.firstCall.args[0]).to.deep.equal({
      total: 1,
      failed: 0,
      successful: 0,
      latencyMean: 0,
      shortCircuited: 0,
      timedOut: 1,
      percentiles: {
        0: 0,
        1: 0,
        0.25: 0,
        0.5: 0,
        0.75: 0,
        0.9: 0,
        0.95: 0,
        0.99: 0,
        0.995: 0
      }
    });
  });
  it('_snapshot should trigger event', () => {
    const stats = new Stats();
    const spy = sinon.spy(() => {});
    stats.on('snapshot', spy);
    stats.timeout(100);
    stats._snapshot();
    expect(spy.calledOnce).to.equal(true);
    expect(spy.firstCall.args[0]).to.deep.equal({
      total: 1,
      failed: 0,
      successful: 0,
      latencyMean: 100,
      shortCircuited: 0,
      timedOut: 1,
      percentiles: {
        0: 100,
        1: 100,
        0.25: 100,
        0.5: 100,
        0.75: 100,
        0.9: 100,
        0.95: 100,
        0.99: 100,
        0.995: 100
      }
    });
  });
  it('_shiftAndPush should shift and push', () => {
    const stats = new Stats();
    let arr = [1, 2, 3];
    arr = stats._shiftAndPush(arr, 4);
    expect(arr).to.deep.equal([2, 3, 4]);
  });
  it('Reset should clear buckets and trigger update event', () => {
    const stats = new Stats();
    const spy = sinon.spy(() => {});
    stats.on('update', spy);
    stats.timeout(100);
    stats.reset();
    expect(spy.calledTwice).to.equal(true);
    expect(spy.secondCall.args[0]).to.deep.equal({
      total: 0,
      failed: 0,
      successful: 0,
      shortCircuited: 0,
      latencyMean: 0,
      timedOut: 0,
      percentiles: {
        0: 0,
        1: 0,
        0.25: 0,
        0.5: 0,
        0.75: 0,
        0.9: 0,
        0.95: 0,
        0.99: 0,
        0.995: 0
      }
    });
  });
});
