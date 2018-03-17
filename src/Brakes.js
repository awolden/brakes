'use strict';

const EventEmitter = require('events').EventEmitter;
const Promise = require('bluebird');
const Stats = require('./Stats');
const promisifyIfFunction = require('./utils').promisifyIfFunction;
const globalStats = require('./globalStats');
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
  fallback: undefined,
  isFunction: false,
  isPromise: false
};

class Brakes extends EventEmitter {
  constructor(func, opts) {
    super();

    if (typeof func === 'object' && !opts) {
      opts = func;
      func = undefined;
    }
    this._circuitOpen = false;
    this._resetTimer = undefined;
    this._fallback = undefined;

    this._opts = Object.assign({}, defaultOptions, opts);
    this._stats = new Stats(opts);

    this._circuitGeneration = 1;

    this.name = this._opts.name;
    this.group = this._opts.group;

    this._attachListeners();
    this._stats.startSnapshots();

    // register with global stats collector
    if (this._opts.registerGlobal) {
      globalStats.register(this);
    }

    const isPromise = this._opts.isPromise;
    const isFunction = this._opts.isFunction;

    // check if health check is in options
    if (this._opts.healthCheck) {
      this.healthCheck(this._opts.healthCheck, isPromise, isFunction);
    }

    // create a master circuit
    if (func) {
      this._masterCircuit = new Circuit(this, func, opts);
    }

    // check if fallback is in options
    if (this._opts.fallback) {
      this.fallback(this._opts.fallback, isPromise, isFunction);
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
    eventNames.forEach(event => {
      this.removeAllListeners(event);
    });
  }

  exec() {
    if (this._masterCircuit) {
      return this._masterCircuit.exec.apply(this._masterCircuit, arguments);
    }
    return Promise.reject(new Error(consts.NO_FUNCTION));
  }

  _close() {
    this._circuitOpen = false;
    this.emit('circuitClosed');
  }

  _open() {
    if (this._circuitOpen) return;
    this.emit('circuitOpen');
    this._circuitOpen = true;
    this._circuitGeneration++;
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
  healthCheck(func, isPromise, isFunction) {
    this._healthCheck = promisifyIfFunction(func, isPromise, isFunction);
  }

  /*
  Allow user to pass function to be used as a fallback
  */
  fallback(func, isPromise, isFunction) {
    if (this._masterCircuit) {
      this._fallback = this._masterCircuit.fallback(func, isPromise, isFunction);
    }
    else {
      this._fallback = promisifyIfFunction(func, isPromise, isFunction);
    }
  }

  /*
  Listen to certain events and execute logic
  This is mostly used for stats monitoring
  */
  _attachListeners() {
    this.on('success', d => {
      this._successHandler(d);
    });
    this.on('timeout', (d, error, execGeneration) => {
      this._timeoutHandler(d, execGeneration);
    });
    this.on('failure', (d, error, execGeneration) => {
      this._failureHandler(d, execGeneration);
    });
    this._stats.on('update', d => {
      this._checkStats(d);
    });
    this._stats.on('snapshot', d => {
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

  _timeoutHandler(runTime, execGeneration) {
    if (execGeneration === this._circuitGeneration) {
      this._stats.timeout(runTime);
    }
  }

  _failureHandler(runTime, execGeneration) {
    if (execGeneration === this._circuitGeneration) {
      this._stats.failure(runTime);
    }
  }

  slaveCircuit(service, fallback, options) {
    return new Circuit(this, service, fallback, options);
  }
}

module.exports = Brakes;
