'use strict';

const consts = require('./consts');

class Bucket {
  constructor() {
    this.failed = 0;
    this.successful = 0;
    this.total = 0;
    this.shortCircuited = 0;
    this.timedOut = 0;
    this.requestTimes = [];
  }

  /* Calculate % of a given field */
  percent(field) {
    // eslint-disable-next-line no-prototype-builtins
    if (!Object(this).hasOwnProperty(field)) {
      throw new Error(consts.INVALID_BUCKET_PROP);
    }

    if (!this.total) {
      return 0;
    }

    return this[field] / this.total;
  }

  /* Register a failure */
  failure(runTime) {
    this.total++;
    this.failed++;
    this.requestTimes.push(runTime);
  }

  /* Register a success */
  success(runTime) {
    this.total++;
    this.successful++;
    this.requestTimes.push(runTime);
  }

  /* Register a short circuit */
  shortCircuit() {
    this.shortCircuited++;
  }

  /* Register a timeout */
  timeout(runTime) {
    this.total++;
    this.timedOut++;
    this.requestTimes.push(runTime);
  }
}

module.exports = Bucket;
