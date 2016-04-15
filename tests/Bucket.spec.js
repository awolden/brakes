'use strict';

const Bucket = require('../lib/Bucket');
const expect = require('chai').expect;
const consts = require('../lib/consts');

describe('Bucket Class', () => {
  let bucket;

  beforeEach(() => {
    bucket = new Bucket();
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
