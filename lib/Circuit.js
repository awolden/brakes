'use strict';

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

function _possibleConstructorReturn(self, call) { if (call && (typeof call === "object" || typeof call === "function")) { return call; } return _assertThisInitialized(self); }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function"); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

function _assertThisInitialized(self) { if (self === void 0) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return self; }

var EventEmitter = require('events').EventEmitter;

var Promise = require('bluebird');

var promisifyIfFunction = require('./utils').promisifyIfFunction;

var TimeOutError = require('./TimeOutError');

var CircuitBrokenError = require('../lib/CircuitBrokenError');

var consts = require('./consts');

var defaultOptions = {
  isFailure: function isFailure() {
    return true;
  }
};
/**
 * Class that can sit on top of a Brakes. It's basically just a pair of primary and fallback Promises you can put on
 * top of a Brake that monitors a common Service (eg: ).
 */

var Circuit =
/*#__PURE__*/
function (_EventEmitter) {
  _inherits(Circuit, _EventEmitter);

  function Circuit(brakes, main, fallback, options) {
    var _this;

    _classCallCheck(this, Circuit);

    _this = _possibleConstructorReturn(this, (Circuit.__proto__ || Object.getPrototypeOf(Circuit)).call(this));

    if (!(brakes instanceof EventEmitter)) {
      throw new Error(consts.NO_BRAKES);
    }

    _this._brakes = brakes;

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

    _this._opts = Object.assign({}, defaultOptions, options);
    _this._this = _this._opts.this || _assertThisInitialized(_this);
    _this._serviceCall = promisifyIfFunction(main, _this._opts.isPromise, _this._opts.isFunction);

    if (fallback) {
      _this.fallback(fallback, _this._opts.isPromise, _this._opts.isFunction);
    }

    return _this;
  }

  _createClass(Circuit, [{
    key: "exec",
    value: function exec() {
      var _this2 = this,
          _arguments = arguments;

      this._brakes.emit('exec'); // Save circuit generation to scope so we can compare it
      // to the current generation when a request fails.
      // This prevents failures from bleeding between circuit generations.


      var execGeneration = this._brakes._circuitGeneration;

      if (this._brakes._circuitOpen) {
        this._brakes._stats.shortCircuit();

        if (this._fallback) {
          return this._fallback.apply(this, arguments);
        } else if (this._brakes._fallback) {
          return this._brakes._fallback.apply(this, arguments);
        }

        return Promise.reject(new CircuitBrokenError(this._brakes.name, this._brakes._stats._totals, this._brakes._opts.threshold));
      }

      var startTime = Date.now(); // we use _execPromise() wrapper on the service call promise
      // to allow us to more easily hook in stats reporting

      return this._execPromise.apply(this, arguments).tap(function () {
        return _this2._brakes.emit('success', Date.now() - startTime);
      }).catch(function (err) {
        var endTime = Date.now() - startTime; // trigger hook listeners

        if (err instanceof TimeOutError) {
          _this2._brakes.emit('timeout', endTime, err, execGeneration);
        } else if (_this2._opts.isFailure(err)) {
          _this2._brakes.emit('failure', endTime, err, execGeneration);
        } // if fallback exists, call it upon failure
        // there are no listeners or stats collection for
        // the fallback function. The function is fire-and-forget
        // as far as `Brakes` is concerned


        if (_this2._fallback) {
          return _this2._fallback.apply(_this2, _arguments);
        } else if (_this2._brakes._fallback) {
          return _this2._brakes._fallback.apply(_this2, _arguments);
        }

        if (err.message && _this2._brakes.name) {
          err.message = `[Breaker: ${_this2._brakes.name}] ${err.message}`;
        }

        return Promise.reject(err);
      });
    }
    /*
     Execute main service call
     */

  }, {
    key: "_execPromise",
    value: function _execPromise() {
      var _this3 = this,
          _arguments2 = arguments;

      return new Promise(function (resolve, reject) {
        // start timeout timer
        var timeoutTimer = setTimeout(function () {
          reject(new TimeOutError(consts.TIMEOUT));
        }, _this3._opts.timeout || _this3._brakes._opts.timeout);

        _this3._serviceCall.apply(_this3._this, _arguments2).then(function (result) {
          clearTimeout(timeoutTimer);
          resolve(result);
        }).catch(function (err) {
          clearTimeout(timeoutTimer);
          reject(err);
        });

        timeoutTimer.unref();
      });
    }
  }, {
    key: "fallback",
    value: function fallback(func, isPromise, isFunction) {
      this._fallback = promisifyIfFunction(func, isPromise, isFunction);
      return this._fallback;
    }
  }]);

  return Circuit;
}(EventEmitter);

module.exports = Circuit;