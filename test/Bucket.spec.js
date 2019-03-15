'use strict';

const Bucket = require('../lib/Bucket');
const expect = require('chai').expect;

describe('Bucket Class', () => {
  let bucket;

  beforeEach(() => {
    bucket = new Bucket({
      countTotal: 0, countTotalDeriv: 0, countSuccess: 0, countSuccessDeriv: 0, countFailure: 0, countFailureDeriv: 0, countTimeout: 0, countTimeoutDeriv: 0, countShortCircuited: 0, countShortCircuitedDeriv: 0
    });
  });

  it('Should be instantied with all empty values', () => {
    expect(bucket.failed).to.equal(0);
    expect(bucket.successful).to.equal(0);
    expect(bucket.timedOut).to.equal(0);
    expect(bucket.total).to.equal(0);
  });
  it('Should increment failed', () => {
    bucket.failure();
    expect(bucket.failed).to.equal(1);
    expect(bucket.total).to.equal(1);
  });
  it('Should increment successful', () => {
    bucket.success();
    expect(bucket.successful).to.equal(1);
    expect(bucket.total).to.equal(1);
  });
  it('Should increment shortCircuited', () => {
    bucket.shortCircuit();
    expect(bucket.total).to.equal(0);
    expect(bucket.shortCircuited).to.equal(1);
  });
  it('Should increment timedOut', () => {
    bucket.timeout();
    expect(bucket.timedOut).to.equal(1);
    expect(bucket.total).to.equal(1);
  });
  it('Should calcuate percent', () => {
    bucket.timeout();
    bucket.timeout();
    bucket.success();
    bucket.success();
    expect(bucket.percent('successful')).to.equal(0.5);
  });
  it('Should return 0', () => {
    expect(bucket.percent('failed')).to.equal(0);
  });
  it('Should fail to calcuate percent', () => {
    expect(() => {
      bucket.percent('fake');
    }).to.throw(Error);
  });
});
