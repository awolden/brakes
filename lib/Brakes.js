const EventEmitter = require('events').EventEmitter;
const promisify = require('promisify-node');
const Stats = require('./Stats');
const TimeOutError = require('./TimeOutError');
const consts = require('./consts');
const _ = require('lodash');

module.exports = Brakes;

const defaultOptions = {
  bucketSpan: 1000,
  bucketNum: 60,
  circuitDuration: 30000,
  statInterval: 1200,
  threshold: 0.5,
  startDelay: 60000
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
    this._startStats();
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
          return this._fallback(...arguments);
        }

        return err;

      });

  }

  /*
  Execute main service call
  */
  _execPromise() {
    return new Promise((resolve, reject) => {

      this._serviceCall(...arguments).then((result) => {
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

  _open() {
    this._openTimer = setTimeout(() => {
      this._closed = false;
      this.emit('circuitOpen');
    }, this._opts.circuitDuration);
    this._openTime.unref();
  }

  _close() {
    this.emit('circuitBroken');
    this._closed = true;
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
    this.on('success', this._successHandler);
    this.on('timeout', this._timeoutHandler);
    this.on('failure', this._failureHandler);

    this._stats.on('updated', this._checkStats);
    this._stats.on('snapShot', this._snapshotHandler);

  }

  _startStats() {
    setTimeout(this._stats.startSnapshots, this._opts.startDelay);
  }

  _checkStats(stats) {
    if (stats.successful / stats.total < this._opts.threshold) {
      this._close();
    }
  }

  _snapshotHandler(stats) {
    this.emit('snapshot', stats);
  }

  _successHandler(runTime) {
    this._stats.successful(runTime);
  }
  _timeoutHandler(runTime) {
    this._stats.timeout(runTime);
  }
  _failureHandler(runTime) {
    this._stats.failure(runTime);
  }

}
