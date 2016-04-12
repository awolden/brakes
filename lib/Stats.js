'use strict';
const EventEmitter = require('events').EventEmitter;
const Bucket = require('./Bucket');
const _ = require('lodash');


/* Example Default Options */
const defaultOptions = {
  bucketSpan: 1000,
  bucketNum: 60,
  statInterval: 1200
};

module.exports = Stats;

class Stats extends EventEmitter {

  constructor(opts) {
    this._opts = _.defaults(opts, defaultOptions);

    // initialize buckets
    this._buckets = [];
    for (let i = 0; i < this._opts.bucketNum; i++) {
      this._buckets.push(new Bucket());
    }
    this._activeBucket = this._buckets[this._activePosition];

    this._startBucketSpinning();
  }

  /* Starts cycling through buckets */
  _startBucketSpinning() {
    this._spinningInterval = setInterval(() => {
      this._shiftAndPush(this.buckets, new Bucket());
      this._activeBucket = this._buckets[this._activePosition];
    }, this._opts.bucketSpan);
  }

  /* Stop Bucket from spinning */
  _stopBucketSpinning() {
    if (this._spinningInterval) {
      return clearInterval(this._spinningInterval);
    }
    return false;
  }

  /* Starts cycling through buckets */
  startSnapshots(interval) {
    this._snapshotInterval = setInterval(this._snapshot,
      this.statInterval || interval);
  }

  /* Starts cycling through buckets */
  stopSnapshots() {
    if (this._snapshotInterval) {
      return clearInterval(this._snapshotInterval);
    }
    return false;
  }

  /* Generate new totals*/
  _generateStats(buckets) {
    // reduce buckets
    this._totals = buckets.reduce((prev, cur) => {
      if (!cur) return prev;

      prev.total += cur.total || 0;
      prev.failed += cur.failed || 0;
      prev.timedOut += cur.timedOut || 0;
      prev.successful += cur.successful || 0;

      return prev;
    }, {
      failed: 0,
      timedOut: 0,
      total: 0,
      successful: 0
    });

    return this.totals;
  }

  /* Update totals and send updated event */
  _update() {
    this.emit('update', this._generateStats());
  }

  /* Send snapshot stats event */
  _snapshot() {
    this.emit('snapshot', this._totals);
  }

  /* Register a failure */
  failure() {
    this._activeBucket.failure();
    this._update();
  }

  /* Register a success */
  successful() {
    this._activeBucket.successful();
    this._update();
  }

  /* Register a timeout */
  timeout() {
    this._activeBucket.timeout();
    this._update();
  }

}
