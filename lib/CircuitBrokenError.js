'use strict';

const consts = require('./consts');

class CircuitBrokenError extends Error {

  constructor(stats, opts) {
    super();

    this.message = `${consts.CIRCUIT_BROKEN} - The percentage of failed requests (${Math.floor((stats.failed / stats.total) * 100)}%) is greater than the threshold specified (${opts.threshold * 100}%)`;
    this.stats = stats;
  }
}

module.exports = CircuitBrokenError;
