'use strict';

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

function _possibleConstructorReturn(self, call) { if (call && (typeof call === "object" || typeof call === "function")) { return call; } return _assertThisInitialized(self); }

function _assertThisInitialized(self) { if (self === void 0) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function"); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var EventEmitter = require('events').EventEmitter;

var Bucket = require('./Bucket');
/* Example Default Options */


var defaultOptions = {
  bucketSpan: 1000,
  bucketNum: 60,
  percentiles: [0.0, 0.25, 0.5, 0.75, 0.9, 0.95, 0.99, 0.995, 1],
  statInterval: 1200
};

var Stats =
/*#__PURE__*/
function (_EventEmitter) {
  _inherits(Stats, _EventEmitter);

  function Stats(opts) {
    var _this;

    _classCallCheck(this, Stats);

    _this = _possibleConstructorReturn(this, (Stats.__proto__ || Object.getPrototypeOf(Stats)).call(this));
    _this._opts = Object.assign({}, defaultOptions, opts);
    _this._activePosition = _this._opts.bucketNum - 1; // initialize buckets

    _this._buckets = [];

    for (var i = 0; i < _this._opts.bucketNum; i++) {
      _this._buckets.push(new Bucket());
    }

    _this._activeBucket = _this._buckets[_this._activePosition];

    _this._startBucketSpinning();

    _this._totals = _this._generateStats(_this._buckets, true);
    return _this;
  }

  _createClass(Stats, [{
    key: "reset",
    value: function reset() {
      for (var i = 0; i < this._opts.bucketNum; i++) {
        this._shiftAndPush(this._buckets, new Bucket());
      }

      this._activeBucket = this._buckets[this._activePosition];

      this._update();
    }
    /* Starts cycling through buckets */

  }, {
    key: "_startBucketSpinning",
    value: function _startBucketSpinning() {
      var _this2 = this;

      this._spinningInterval = setInterval(function () {
        _this2._shiftAndPush(_this2._buckets, new Bucket());

        _this2._activeBucket = _this2._buckets[_this2._activePosition];
      }, this._opts.bucketSpan);

      this._spinningInterval.unref();
    }
    /* Stop Bucket from spinning */

  }, {
    key: "_stopBucketSpinning",
    value: function _stopBucketSpinning() {
      if (this._spinningInterval) {
        clearInterval(this._spinningInterval);
        this._spinningInterval = undefined;
        return true;
      }

      return false;
    }
    /* start generating snapshots */

  }, {
    key: "startSnapshots",
    value: function startSnapshots(interval) {
      var _this3 = this;

      this._snapshotInterval = setInterval(function () {
        _this3._snapshot();
      }, interval || this._opts.statInterval);

      this._snapshotInterval.unref();
    }
    /* stop generating snapshots */

  }, {
    key: "stopSnapshots",
    value: function stopSnapshots() {
      if (this._snapshotInterval) {
        clearInterval(this._snapshotInterval);
        this._snapshotInterval = undefined;
        return true;
      }

      return false;
    }
    /*
    Generate new totals
    `includeLatencyStats` flag determines whether or not to calculate a new round of
    percentiles. If `includeLatencyStats` is set to false or undefined, the existing
    calculated percentiles will be preserved.
    */

  }, {
    key: "_generateStats",
    value: function _generateStats(buckets, includeLatencyStats) {
      var _this4 = this;

      // reduce buckets
      var tempTotals = buckets.reduce(function (prev, cur) {
        if (!cur) return prev; // aggregate incremented stats

        prev.total += cur.total || 0;
        prev.failed += cur.failed || 0;
        prev.timedOut += cur.timedOut || 0;
        prev.successful += cur.successful || 0;
        prev.shortCircuited += cur.shortCircuited || 0; // concat `requestTimes` Arrays

        if (includeLatencyStats) {
          prev.requestTimes.push.apply(prev.requestTimes, cur.requestTimes || []);
        }

        return prev;
      }, {
        failed: 0,
        timedOut: 0,
        total: 0,
        shortCircuited: 0,
        latencyMean: 0,
        successful: 0,
        requestTimes: [],
        percentiles: {}
      }); // calculate percentiles

      if (includeLatencyStats) {
        tempTotals.requestTimes.sort(function (a, b) {
          return a - b;
        });
        tempTotals.latencyMean = this._calculateMean(tempTotals.requestTimes) || 0;

        this._opts.percentiles.forEach(function (p) {
          tempTotals.percentiles[p] = _this4._calculatePercentile(p, tempTotals.requestTimes) || 0;
        });
      } else {
        // pass through previous percentile and mean
        tempTotals.latencyMean = this._totals.latencyMean;
        tempTotals.percentiles = this._totals.percentiles;
      } // remove large totals Arrays


      delete tempTotals.requestTimes;
      this._totals = tempTotals;
      return this._totals;
    }
    /*
    Calculate percentile.
    This function assumes the list you are giving it is already ordered.
    */

  }, {
    key: "_calculatePercentile",
    value: function _calculatePercentile(percentile, array) {
      if (percentile === 0) {
        return array[0];
      }

      var idx = Math.ceil(percentile * array.length);
      return array[idx - 1];
    }
    /*
    Calculate mean.
    */

  }, {
    key: "_calculateMean",
    value: function _calculateMean(array) {
      var sum = array.reduce(function (a, b) {
        return a + b;
      }, 0);
      return Math.round(sum / array.length);
    }
    /* Update totals and send updated event */

  }, {
    key: "_update",
    value: function _update() {
      this.emit('update', this._generateStats(this._buckets));
    }
  }, {
    key: "_shiftAndPush",
    value: function _shiftAndPush(arr, item) {
      arr.push(item);
      arr.shift();
      return arr;
    }
    /* Send snapshot stats event */

  }, {
    key: "_snapshot",
    value: function _snapshot() {
      this.emit('snapshot', this._generateStats(this._buckets, true));
    }
    /* Register a failure */

  }, {
    key: "failure",
    value: function failure(runTime) {
      this._activeBucket.failure(runTime);

      this._update();
    }
    /* Register a success */

  }, {
    key: "success",
    value: function success(runTime) {
      this._activeBucket.success(runTime);

      this._update();
    }
    /* Register a short circuit */

  }, {
    key: "shortCircuit",
    value: function shortCircuit() {
      this._activeBucket.shortCircuit();

      this._update();
    }
    /* Register a timeout */

  }, {
    key: "timeout",
    value: function timeout(runTime) {
      this._activeBucket.timeout(runTime);

      this._update();
    }
  }]);

  return Stats;
}(EventEmitter);

module.exports = Stats;