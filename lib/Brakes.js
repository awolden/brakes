const EventEmitter = require('events').EventEmitter;
const promisify = require("promisify-node");

module.exports = Brakes;

class Brakes extends EventEmitter {

  constructor(func, opts) {
    super();
    this._closed = false;
    this._resetTimer = undefined;
    this._fallback = undefined;
    this._serviceCall = promisify(func);
    this._opts = opts || {};
    this._attachListeners();
  }

  exec() {
    if (this._closed) {
      //do something when closed
    }
    let startTime = new Date().getTime();

    // we use _execPromise() wrapper on the service call promise
    // to all Brakes us to more easily hook in stats reporting
    return this._execPromise(...arguments).then((result) => {
      this.emit('success', new Date().getTime() - startTime);
      return result;
    }).catch((err) => {

      // trigger hook listeners
      if (err instanceof TimeOutError) {
        this.emit('timeout', new Date().getTime() - startTime);
      } else {
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
      let timeoutTimer = setTimeout(() => {
        reject(new TimeOutError(consts.TIMEOUT));
      }, this._opts.timeout);

      timeoutTimer.unref();
    });
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
  }

  _successHandler(runTime) {
    console.log('success handler', runTime);
  }
  _timeoutHandler(runTime) {
    console.log('timeout handler', runTime);
  }
  _failureHandler(runTime) {
    console.log('failure handler', runTime);
  }

}
