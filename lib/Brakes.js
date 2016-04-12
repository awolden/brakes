'use strict';

const EventEmitter = require('events').EventEmitter;
const promisify = require('promisify-node');
const Stats = require('./Stats');
const TimeOutError = require('./TimeOutError');
const consts = require('./consts');
const _ = require('lodash');

const defaultOptions = {
  bucketSpan: 1000,
  bucketNum: 60,
  circuitDuration: 30000,
  statInterval: 1200,
  startDelay: 5000,
  threshold: 0.5,
  timeout: 15000
};


class Brakes extends EventEmitter {

  constructor(func, opts) {
    super();
    this._closed = false;
    this._resetTimer = undefined;
    this._fallback = undefined;
    this._serviceCall = promisify(func);
    this._opts = _.defaults(opts, defaultOptions);
    this._stats = new Stats(opts);

    this._attachListeners();
    this._stats.startSnapshots();
    this._startStatsCheck();
  }

  exec() {
    if (this._closed) {
      return Promise.reject(consts.CIRCUIT_BROKEN);
    }

    const startTime = new Date().getTime();

    // we use _execPromise() wrapper on the service call promise
    // to all Brakes us to more easily hook in stats reporting
    return this._execPromise
      .apply(this, arguments)
      .then((result) => {
        this.emit('success', new Date().getTime() - startTime);
        return result;
      }).catch((err) => {
        // trigger hook listeners
        if (err instanceof TimeOutError) {
          this.emit('timeout', new Date().getTime() - startTime);
        }
        else {
          this.emit('failure', new Date().getTime() - startTime);
        }
        // if fallback exists, call it upon failure
        // there are no listeners or stats collection for
        // the fallback function. The function is fire-and-forget
        // as far as `Brakes` is concerned
        if (this._fallback) {
          return this._fallback.apply(this, arguments);
        }

        return Promise.reject(err);
      });

  }

  /*
  Execute main service call
  */
  _execPromise() {
    return new Promise((resolve, reject) => {

      this._serviceCall.apply(this, arguments).then((result) => {
        resolve(result);
      }).catch((err) => {
        reject(err);
      });

      // start timeout timer
      const timeoutTimer = setTimeout(() => {
        reject(new TimeOutError(consts.TIMEOUT));
      }, this._opts.timeout);

      timeoutTimer.unref();
    });
  }

  _startStatsCheck() {
    this._statsTimer = setTimeout(() => {
      this._checkingStatus = true;
    }, this._opts.startDelay);
    this._statsTimer.unref();
  }

  _stopStatsCheck() {
    this._checkingStatus = false;
  }

  _open() {
    this._closed = false;
    this._startStatsCheck();
    this.emit('circuitOpen');
  }

  _close() {
    if (this._closed) return;
    this._stopStatsCheck();
    this._stats.reset();
    this.emit('circuitBroken');
    this._closed = true;
    this._openTimer = setTimeout(() => {
      this._open();
    }, this._opts.circuitDuration);
    this._openTimer.unref();
  }

  /*
  Allow user to pass function to be used as a fallback
  */
  fallback(func) {
    this._fallback = promisify(func);
  }

  /*
  Listen to certain events and execute logic
  This is mostly used for stats monitoring
  */
  _attachListeners() {
    this.on('success', (d) => {
      this._successHandler(d);
    });
    this.on('timeout', (d) => {
      this._timeoutHandler(d);
    });
    this.on('failure', (d) => {
      this._failureHandler(d);
    });
    this._stats.on('update', (d) => {
      this._checkStats(d);
    });
    this._stats.on('snapshot', (d) => {
      this._snapshotHandler(d);
    });

  }

  _checkStats(stats) {
    if (!this._checkingStatus || !stats.total || this._closed) return;
    if ((stats.successful / stats.total) < this._opts.threshold) {
      this._close();
    }
  }

  _snapshotHandler(stats) {
    this.emit('snapshot', stats);
  }

  _successHandler(runTime) {
    this._stats.success(runTime);
  }

  _timeoutHandler(runTime) {
    this._stats.timeout(runTime);
  }

  _failureHandler(runTime) {
    this._stats.failure(runTime);
  }

}

module.exports = Brakes;
