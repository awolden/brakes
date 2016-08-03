'use strict';

const EventEmitter = require('events').EventEmitter;
const Promise = require('bluebird');
const Stats = require('./Stats');
const hasCallback = require('./utils').hasCallback;
const globalStats = require('./globalStats');
const TimeOutError = require('./TimeOutError');
const CircuitBrokenError = require('../lib/CircuitBrokenError');
const consts = require('./consts');
const Circuit = require('./Circuit');

const defaultOptions = {
  bucketSpan: 1000,
  bucketNum: 60,
  name: 'defaultBrake',
  group: 'defaultBrakeGroup',
  circuitDuration: 30000,
  statInterval: 1200,
  registerGlobal: true,
  waitThreshold: 100,
  threshold: 0.5,
  timeout: 15000,
  healthCheckInterval: 5000,
  healthCheck: undefined,
  fallback: undefined
};

class Brakes extends EventEmitter {

  constructor(func, opts) {
    super();

    if (!func || typeof func !== 'function') {
      throw new Error(consts.NO_FUNCTION);
    }
    this._circuitOpen = false;
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
    this.group = this._opts.group;

    this._attachListeners();
    this._stats.startSnapshots();

    // register with global stats collector
    if (this._opts.registerGlobal) {
      globalStats.register(this);
    }

    // check if health check is in options
    if (this._opts.healthCheck) {
      this.healthCheck(this._opts.healthCheck);
    }

    // check if fallback is in options
    if (this._opts.fallback) {
      this.fallback(this._opts.fallback);
    }
  }

  /* Static method to get access to global stats */
  static getGlobalStats() {
    return globalStats;
  }

  /* Instance method to get access to global stats */
  getGlobalStats() {
    return globalStats;
  }

  /*
  Perform all logic to allow proper garbage collection
  */
  destroy() {
    globalStats.deregister(this);
    // the line below won't be needed with Node6, it provides
    // a method 'eventNames()'
    const eventNames = Object.keys(this._events);
    eventNames.forEach((event) => {
      this.removeAllListeners(event);
    });
  }

  exec() {
    if (this._circuitOpen) {
      this._stats.shortCircuit();
      if (this._fallback) {
        return this._fallback.apply(this, arguments);
      }
      return Promise.reject(new CircuitBrokenError(this._stats._totals, this._opts.threshold));
    }

    const startTime = new Date().getTime();

    // we use _execPromise() wrapper on the service call promise
    // to allow us to more easily hook in stats reporting
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

      // start timeout timer
      const timeoutTimer = setTimeout(() => {
        reject(new TimeOutError(consts.TIMEOUT));
      }, this._opts.timeout);

      this._serviceCall.apply(this, arguments).then((result) => {
        clearTimeout(timeoutTimer);
        resolve(result);
      }).catch((err) => {
        clearTimeout(timeoutTimer);
        reject(err);
      });

      timeoutTimer.unref();
    });
  }

  _close() {
    this._circuitOpen = false;
    this.emit('circuitClosed');
  }

  _open() {
    if (this._circuitOpen) return;
    this.emit('circuitOpen');
    this._circuitOpen = true;
    if (this._healthCheck) {
      this._setHealthInterval();
    }
    else {
      this._resetCircuitTimeout();
    }
  }

  _setHealthInterval() {
    if (this._healthInterval) return;
    this._healthInterval = setInterval(() => {
      if (this._circuitOpen) {
        this._healthCheck().then(() => {
          // it is possible that in the meantime, the circuit is already
          // closed by the previous health check
          if (this._circuitOpen) {
            this._stats.reset();
            this._close();
          }
          this._healthInterval = clearInterval(this._healthInterval);
        }).catch(err => {
          this.emit('healthCheckFailed', err);
        });
      }
      else {
        // the circuit is closed out of health check,
        // or from one of the cascading health checks
        // (if the interval is not long enough to wait for one
        // health check to complete, the previous health check might
        // close the circuit) OR (manually closed).
        this._healthInterval = clearInterval(this._healthInterval);
      }
    }, this._opts.healthCheckInterval);
    this._healthInterval.unref();
  }

  _resetCircuitTimeout() {
    const timer = setTimeout(() => {
      this._stats.reset();
      this._close();
    }, this._opts.circuitDuration);
    timer.unref();
  }

  /*
  Allow user to pass a function to be used as a health check,
  to close the circuit if the function succeeds.
   */
  healthCheck(func) {
    if (hasCallback(func)) {
      this._healthCheck = Promise.promisify(func);
    }
    else {
      this._healthCheck = func;
    }
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

  /*
  Calculate stats and set internal state based on threshold
  */
  _checkStats(stats) {
    const pastThreshold = (stats.total || 0) > this._opts.waitThreshold;
    if (!pastThreshold || !stats.total || this._circuitOpen) return;
    if ((stats.successful / stats.total) < this._opts.threshold) {
      this._open();
    }
  }

  isOpen() {
    return this._circuitOpen;
  }

  _snapshotHandler(stats) {
    // attach stats metaData for easier downstream consumption
    this.emit('snapshot', {
      name: this.name,
      group: this.group,
      time: Date.now(),
      open: this._circuitOpen,
      circuitDuration: this._opts.circuitDuration,
      threshold: this._opts.threshold,
      waitThreshold: this._opts.waitThreshold,
      stats
    });
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

  createCircuit(service, fallback, options) {
    return new Circuit(this, service, fallback, options);
  }
}

module.exports = Brakes;
