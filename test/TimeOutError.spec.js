'use strict';

const TimeOutError = require('../lib/TimeOutError');
const expect = require('chai').expect;

describe('TimeOutError', () => {
  it('Should be an instance of error', () => {
    expect(new TimeOutError()).to.be.instanceof(Error);
  });
});
