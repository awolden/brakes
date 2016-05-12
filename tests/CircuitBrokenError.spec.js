'use strict';

const CircuitBrokenError = require('../lib/CircuitBrokenError');
const consts = require('../lib/consts');
const expect = require('chai').expect;

describe('CircuitBrokenError', () => {
  it('Should be an instance of error', () => {
    const mockTotals = {
      failed: 60,
      timedOut: 0,
      total: 100,
      successful: 40
    };
    const mockThreshold = 0.5;
    expect(new CircuitBrokenError(mockTotals, mockThreshold)).to.be.instanceof(Error);
  });
  it('Should contain expected properties', () => {
    const mockTotals = {
      failed: 60,
      timedOut: 0,
      total: 100,
      successful: 40
    };
    const mockThreshold = 0.5;
    const error = new CircuitBrokenError(mockTotals, mockThreshold);
    expect(error).to.have.a.property('message').that.is.a('string');
    expect(error).to.have.a.property('totals').that.is.an('object');
    expect(error).to.have.a.property('totals').that.is.an('object').that.deep.equals(mockTotals);
  });
  it('Should have expected error string with calculated failure percentage', () => {
    const mockTotals = {
      failed: 60,
      timedOut: 0,
      total: 100,
      successful: 40
    };
    const mockThreshold = 0.5;
    expect(new CircuitBrokenError(mockTotals, mockThreshold)).to.have.a.property('message').that.equals(`${consts.CIRCUIT_BROKEN} - The percentage of failed requests (60%) is greater than the threshold specified (50%)`);
  });

});
