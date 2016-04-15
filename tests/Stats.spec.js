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
  it('Generate Blank Stats', () => {
    const stats = new Stats();
    const buckets = [null, null];
    expect(stats._generateStats(buckets)).to.deep.equal({
      total: 0,
      failed: 0,
      successful: 0,
      timedOut: 0
    });
  });
  it('Generate Complete Stats', () => {
    const stats = new Stats();
    const buckets = [
      new Bucket(),
      new Bucket()
    ];
    buckets[0].failure();
    buckets[1].failure();
    buckets[0].success();
    buckets[1].success();
    buckets[0].timeout();
    buckets[1].timeout();
    expect(stats._generateStats(buckets)).to.deep.equal({
      total: 6,
      failed: 2,
      successful: 2,
      timedOut: 2
    });
    expect(stats._totals).to.deep.equal({
      total: 6,
      failed: 2,
      successful: 2,
      timedOut: 2
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
      timedOut: 0
    });
  });
  it('Should increment failure and call update', () => {
    const stats = new Stats();
    const spy = sinon.spy(() => {});
    stats.on('update', spy);
    stats.failure();
    expect(spy.calledOnce).to.equal(true);
    expect(spy.firstCall.args[0]).to.deep.equal({
      total: 1,
      failed: 1,
      successful: 0,
      timedOut: 0
    });
  });
  it('Should increment success and call update', () => {
    const stats = new Stats();
    const spy = sinon.spy(() => {});
    stats.on('update', spy);
    stats.success();
    expect(spy.calledOnce).to.equal(true);
    expect(spy.firstCall.args[0]).to.deep.equal({
      total: 1,
      failed: 0,
      successful: 1,
      timedOut: 0
    });
  });
  it('Should increment timedOut and call update', () => {
    const stats = new Stats();
    const spy = sinon.spy(() => {});
    stats.on('update', spy);
    stats.timeout();
    expect(spy.calledOnce).to.equal(true);
    expect(spy.firstCall.args[0]).to.deep.equal({
      total: 1,
      failed: 0,
      successful: 0,
      timedOut: 1
    });
  });
  it('_snapshot should trigger event', () => {
    const stats = new Stats();
    const spy = sinon.spy(() => {});
    stats.on('snapshot', spy);
    stats.timeout();
    stats._snapshot();
    expect(spy.calledOnce).to.equal(true);
    expect(spy.firstCall.args[0]).to.deep.equal({
      total: 1,
      failed: 0,
      successful: 0,
      timedOut: 1
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
    stats.reset();
    expect(spy.calledOnce).to.equal(true);
    expect(spy.firstCall.args[0]).to.deep.equal({
      total: 0,
      failed: 0,
      successful: 0,
      timedOut: 0
    });
  });
});
