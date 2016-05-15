'use strict';

const EventEmitter = require('events').EventEmitter;
const Promise = require('bluebird');
const Stats = require('./Stats');
const hasCallback = require('./utils').hasCallback;
const TimeOutError = require('./TimeOutError');
const CircuitBrokenError = require('../lib/CircuitBrokenError');
const consts = require('./consts');

const defaultOptions = {
  bucketSpan: 1000,
  bucketNum: 60,
  name: 'defaultBrake',
  circuitDuration: 30000,
  statInterval: 1200,
  startDelay: 5000,
  threshold: 0.5,
  timeout: 15000
};


class Brakes extends EventEmitter {

  constructor(func, opts) {
    super();

    if (!func || typeof func !== 'function') {
      throw new Error(consts.NO_FUNCTION);
    }
    this._closed = false;
    this._resetTimer = undefined;
    this._fallback = undefined;
    if (hasCallback(func)) {
      this._serviceCall = Promise.promisify(func);
    }
    else {
      this._serviceCall = func;
    }
    this._opts = Object.assign({}, defaultOptions, opts);
    this._stats = new Stats(opts);

    this.name = this._opts.name;

    this._attachListeners();
    this._stats.startSnapshots();
    this._startStatsCheck();
  }

  exec() {
    if (this._closed) {
      if (this._fallback) {
        return this._fallback.apply(this, arguments);
      }
      return Promise.reject(new CircuitBrokenError(this._stats._totals, this._opts.threshold));
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
    this.emit('circuitBroken');
    this._closed = true;
    this._openTimer = setTimeout(() => {
      this._stats.reset();
      this._open();
    }, this._opts.circuitDuration);
    this._openTimer.unref();
  }

  /*
  Allow user to pass function to be used as a fallback
  */
  fallback(func) {
    if (hasCallback(func)) {
      this._fallback = Promise.promisify(func);
    }
    else {
      this._fallback = func;
    }
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
