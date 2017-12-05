'use strict';

const consts = require('./consts');

class CircuitBrokenError extends Error {
  constructor(totals, threshold) {
    super();

    this.message = `${consts.CIRCUIT_OPENED} - The percentage of failed requests (${Math.floor((1 - totals.successful / totals.total) * 100)}%) is greater than the threshold specified (${threshold * 100}%)`;
    this.totals = totals;
  }
}

module.exports = CircuitBrokenError;
