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
    expect(new CircuitBrokenError('defaultBrake', mockTotals, mockThreshold)).to.be.instanceof(Error);
  });
  it('Should contain expected properties', () => {
    const mockTotals = {
      failed: 60,
      timedOut: 0,
      total: 100,
      successful: 40
    };
    const breakerName = 'Some fancy braker name';
    const mockThreshold = 0.5;
    const error = new CircuitBrokenError(breakerName, mockTotals, mockThreshold);
    expect(error).to.have.a.property('message').that.is.a('string');
    expect(error).to.have.a.property('totals').that.is.an('object').that.deep.equals(mockTotals);
    expect(error).to.have.a.property('name').that.is.a('string').that.equals(breakerName);
  });
  it('Should have expected error string with name of breaker and calculated failure percentage', () => {
    const mockTotals = {
      failed: 60,
      timedOut: 0,
      total: 100,
      successful: 40
    };
    const mockThreshold = 0.5;
    expect(new CircuitBrokenError('defaultBrake', mockTotals, mockThreshold)).to.have.a.property('message').that.equals(`[Breaker: defaultBrake] ${consts.CIRCUIT_OPENED} - The percentage of failed requests (60%) is greater than the threshold specified (50%)`);
  });
  it("Should not decorate the message with the name of the breaker if it's missing", () => {
    const mockTotals = {
      failed: 60,
      timedOut: 0,
      total: 100,
      successful: 40
    };
    const mockThreshold = 0.5;
    expect(new CircuitBrokenError('', mockTotals, mockThreshold)).to.have.a.property('message').that.equals(`${consts.CIRCUIT_OPENED} - The percentage of failed requests (60%) is greater than the threshold specified (50%)`);
  });
});
