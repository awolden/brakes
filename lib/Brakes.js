'use strict';

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

function _possibleConstructorReturn(self, call) { if (call && (typeof call === "object" || typeof call === "function")) { return call; } return _assertThisInitialized(self); }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function"); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

function _assertThisInitialized(self) { if (self === void 0) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return self; }

var EventEmitter = require('events').EventEmitter;

var Promise = require('bluebird');

var Stats = require('./Stats');

var promisifyIfFunction = require('./utils').promisifyIfFunction;

var globalStats = require('./globalStats');

var consts = require('./consts');

var Circuit = require('./Circuit');

var defaultOptions = {
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

var Brakes =
/*#__PURE__*/
function (_EventEmitter) {
  _inherits(Brakes, _EventEmitter);

  function Brakes(func, opts) {
    var _this;

    _classCallCheck(this, Brakes);

    _this = _possibleConstructorReturn(this, (Brakes.__proto__ || Object.getPrototypeOf(Brakes)).call(this));

    if (typeof func === 'object' && !opts) {
      opts = func;
      func = undefined;
    }

    _this._circuitOpen = false;
    _this._resetTimer = undefined;
    _this._fallback = undefined;
    _this._opts = Object.assign({}, defaultOptions, opts);
    _this._stats = new Stats(opts);
    _this._circuitGeneration = 1;
    _this.name = _this._opts.name;
    _this.group = _this._opts.group;

    _this._attachListeners();

    _this._stats.startSnapshots(); // register with global stats collector


    if (_this._opts.registerGlobal) {
      globalStats.register(_assertThisInitialized(_this));
    }

    var isPromise = _this._opts.isPromise;
    var isFunction = _this._opts.isFunction; // check if health check is in options

    if (_this._opts.healthCheck) {
      _this.healthCheck(_this._opts.healthCheck, isPromise, isFunction);
    } // create a master circuit


    if (func) {
      _this._masterCircuit = new Circuit(_assertThisInitialized(_this), func, opts);
    } // check if fallback is in options


    if (_this._opts.fallback) {
      _this.fallback(_this._opts.fallback, isPromise, isFunction);
    }

    return _this;
  }
  /* Static method to get access to global stats */


  _createClass(Brakes, [{
    key: "getGlobalStats",

    /* Instance method to get access to global stats */
    value: function getGlobalStats() {
      return globalStats;
    }
    /*
    Perform all logic to allow proper garbage collection
    */

  }, {
    key: "destroy",
    value: function destroy() {
      var _this2 = this;

      globalStats.deregister(this); // the line below won't be needed with Node6, it provides
      // a method 'eventNames()'

      var eventNames = Object.keys(this._events);
      eventNames.forEach(function (event) {
        _this2.removeAllListeners(event);
      });
    }
  }, {
    key: "exec",
    value: function exec() {
      if (this._masterCircuit) {
        return this._masterCircuit.exec.apply(this._masterCircuit, arguments);
      }

      return Promise.reject(new Error(consts.NO_FUNCTION));
    }
  }, {
    key: "_close",
    value: function _close() {
      this._circuitOpen = false;
      this.emit('circuitClosed');
    }
  }, {
    key: "_open",
    value: function _open() {
      if (this._circuitOpen) return;
      this.emit('circuitOpen');
      this._circuitOpen = true;
      this._circuitGeneration++;

      if (this._healthCheck) {
        this._setHealthInterval();
      } else {
        this._resetCircuitTimeout();
      }
    }
  }, {
    key: "_setHealthInterval",
    value: function _setHealthInterval() {
      var _this3 = this;

      if (this._healthInterval) return;
      this._healthInterval = setInterval(function () {
        if (_this3._circuitOpen) {
          _this3._healthCheck().then(function () {
            // it is possible that in the meantime, the circuit is already
            // closed by the previous health check
            if (_this3._circuitOpen) {
              _this3._stats.reset();

              _this3._close();
            }

            _this3._healthInterval = clearInterval(_this3._healthInterval);
          }).catch(function (err) {
            _this3.emit('healthCheckFailed', err);
          });
        } else {
          // the circuit is closed out of health check,
          // or from one of the cascading health checks
          // (if the interval is not long enough to wait for one
          // health check to complete, the previous health check might
          // close the circuit) OR (manually closed).
          _this3._healthInterval = clearInterval(_this3._healthInterval);
        }
      }, this._opts.healthCheckInterval);

      this._healthInterval.unref();
    }
  }, {
    key: "_resetCircuitTimeout",
    value: function _resetCircuitTimeout() {
      var _this4 = this;

      var timer = setTimeout(function () {
        _this4._stats.reset();

        _this4._close();
      }, this._opts.circuitDuration);
      timer.unref();
    }
    /*
    Allow user to pass a function to be used as a health check,
    to close the circuit if the function succeeds.
     */

  }, {
    key: "healthCheck",
    value: function healthCheck(func, isPromise, isFunction) {
      this._healthCheck = promisifyIfFunction(func, isPromise, isFunction);
    }
    /*
    Allow user to pass function to be used as a fallback
    */

  }, {
    key: "fallback",
    value: function fallback(func, isPromise, isFunction) {
      if (this._masterCircuit) {
        this._fallback = this._masterCircuit.fallback(func, isPromise, isFunction);
      } else {
        this._fallback = promisifyIfFunction(func, isPromise, isFunction);
      }
    }
    /*
    Listen to certain events and execute logic
    This is mostly used for stats monitoring
    */

  }, {
    key: "_attachListeners",
    value: function _attachListeners() {
      var _this5 = this;

      this.on('success', function (d) {
        _this5._successHandler(d);
      });
      this.on('timeout', function (d, error, execGeneration) {
        _this5._timeoutHandler(d, execGeneration);
      });
      this.on('failure', function (d, error, execGeneration) {
        _this5._failureHandler(d, execGeneration);
      });

      this._stats.on('update', function (d) {
        _this5._checkStats(d);
      });

      this._stats.on('snapshot', function (d) {
        _this5._snapshotHandler(d);
      });
    }
    /*
    Calculate stats and set internal state based on threshold
    */

  }, {
    key: "_checkStats",
    value: function _checkStats(stats) {
      var pastThreshold = (stats.total || 0) > this._opts.waitThreshold;
      if (!pastThreshold || !stats.total || this._circuitOpen) return;

      if (stats.successful / stats.total < this._opts.threshold) {
        this._open();
      }
    }
  }, {
    key: "isOpen",
    value: function isOpen() {
      return this._circuitOpen;
    }
  }, {
    key: "_snapshotHandler",
    value: function _snapshotHandler(stats) {
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
  }, {
    key: "_successHandler",
    value: function _successHandler(runTime) {
      this._stats.success(runTime);
    }
  }, {
    key: "_timeoutHandler",
    value: function _timeoutHandler(runTime, execGeneration) {
      if (execGeneration === this._circuitGeneration) {
        this._stats.timeout(runTime);
      }
    }
  }, {
    key: "_failureHandler",
    value: function _failureHandler(runTime, execGeneration) {
      if (execGeneration === this._circuitGeneration) {
        this._stats.failure(runTime);
      }
    }
  }, {
    key: "slaveCircuit",
    value: function slaveCircuit(service, fallback, options) {
      return new Circuit(this, service, fallback, options);
    }
  }], [{
    key: "getGlobalStats",
    value: function getGlobalStats() {
      return globalStats;
    }
  }]);

  return Brakes;
}(EventEmitter);

module.exports = Brakes;