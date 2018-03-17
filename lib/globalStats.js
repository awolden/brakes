'use strict';

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

var stream = require('stream');

var utils = require('../lib/utils');

var GlobalStats =
/*#__PURE__*/
function () {
  function GlobalStats() {
    _classCallCheck(this, GlobalStats);

    this._brakesInstances = []; // create raw stream

    this._rawStream = new stream.Readable({
      objectMode: true,
      highWaterMark: 0
    });

    this._rawStream._read = function () {};

    this._rawStream.resume(); // create hysterix stream


    this._hystrixStream = new stream.Transform({
      objectMode: true,
      highWaterMark: 0
    });
    this._hystrixStream._transform = this._transformToHysterix;

    this._hystrixStream.resume(); // connect the streams


    this._rawStream.pipe(this._hystrixStream);
  }
  /* return number of instances being tracked */


  _createClass(GlobalStats, [{
    key: "instanceCount",
    value: function instanceCount() {
      return this._brakesInstances.length;
    }
    /* register a new instance apply listener */

  }, {
    key: "register",
    value: function register(instance) {
      this._brakesInstances.push(instance);

      instance.on('snapshot', this._globalListener.bind(this));
    }
    /* deregister an existing instance and remove listener */

  }, {
    key: "deregister",
    value: function deregister(instance) {
      var idx = this._brakesInstances.indexOf(instance);

      if (idx > -1) {
        this._brakesInstances.splice(idx, 1);
      }

      instance.removeListener('snapshot', this._globalListener.bind(this));
    }
    /* listen to event and pipe to stream */

  }, {
    key: "_globalListener",
    value: function _globalListener(stats) {
      if (!stats || typeof stats !== 'object') return;

      if (!this._rawStream.isPaused()) {
        this._rawStream.push(JSON.stringify(stats));
      }
    }
    /* transform stats object into hystrix object */

  }, {
    key: "_transformToHysterix",
    value: function _transformToHysterix(stats, encoding, callback) {
      if (!stats || typeof stats !== 'string') return stats;
      var rawStats;
      var mappedStats;

      try {
        rawStats = JSON.parse(stats);
        mappedStats = utils.mapToHystrixJson(rawStats);
      } catch (err) {
        return callback(err);
      }

      return callback(null, `data: ${JSON.stringify(mappedStats)}\n\n`);
    }
    /* listen to event and pipe to stream */

  }, {
    key: "getHystrixStream",
    value: function getHystrixStream() {
      return this._hystrixStream;
    }
    /* listen to event and pipe to stream */

  }, {
    key: "getRawStream",
    value: function getRawStream() {
      return this._rawStream;
    }
  }]);

  return GlobalStats;
}();

module.exports = new GlobalStats();