'use strict';

const EventEmitter = require('events').EventEmitter;
const Promise = require('bluebird');
const hasCallback = require('./utils').hasCallback;
const TimeOutError = require('./TimeOutError');
const CircuitBrokenError = require('../lib/CircuitBrokenError');
const consts = require('./consts');
const Brakes = require('./Brakes');

class Circuit extends EventEmitter {

  constructor(brakes, main, fallback, options) {
    super();

    if (!(brakes instanceof Brakes)) {
      throw new Error(consts.NO_BRAKES);
    }
    this._brakes = brakes;

    if (!main || typeof main !== 'function') {
      throw new Error(consts.NO_FUNCTION);
    } else if (fallback) {
      if (typeof fallback !== 'function') {
        if (options) {
          throw new Error(consts.NO_FUNCTION);
        }
        options = fallback;
        fallback = undefined;
      }
    }
    this._opts = options || {};

    if (hasCallback(main)) {
      this._serviceCall = Promise.promisify(main);
    } else {
      this._serviceCall = main;
    }
    if (fallback) {
      if (hasCallback(fallback)) {
        this._fallback = Promise.promisify(fallback);
      } else {
        this._fallback = fallback;
      }
    } else {
      this._fallback = undefined;
    }
  }

  exec() {
    if (this._brakes._circuitOpen) {
      this._brakes._stats.shortCircuit();
      if (this._fallback) {
        return this._fallback.apply(this, arguments);
      }
      return Promise.reject(new CircuitBrokenError(this._brakes._stats._totals, this._brakes._opts.threshold));
    }

    const startTime = new Date().getTime();

    // we use _execPromise() wrapper on the service call promise
    // to allow us to more easily hook in stats reporting
    return this._execPromise
      .apply(this, arguments)
      .then((result) => {
        this._brakes.emit('success', new Date().getTime() - startTime);
        return result;
      }).catch((err) => {
        // trigger hook listeners
        if (err instanceof TimeOutError) {
          this._brakes.emit('timeout', new Date().getTime() - startTime);
        }
        else {
          this._brakes.emit('failure', new Date().getTime() - startTime);
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
      }, this._opts.timeout || this._brakes._opts.timeout);

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
}

module.exports = Circuit;