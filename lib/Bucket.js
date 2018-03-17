'use strict';

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

var consts = require('./consts');

var Bucket =
/*#__PURE__*/
function () {
  function Bucket() {
    _classCallCheck(this, Bucket);

    this.failed = 0;
    this.successful = 0;
    this.total = 0;
    this.shortCircuited = 0;
    this.timedOut = 0;
    this.requestTimes = [];
  }
  /* Calculate % of a given field */


  _createClass(Bucket, [{
    key: "percent",
    value: function percent(field) {
      // eslint-disable-next-line no-prototype-builtins
      if (!Object(this).hasOwnProperty(field)) {
        throw new Error(consts.INVALID_BUCKET_PROP);
      }

      if (!this.total) {
        return 0;
      }

      return this[field] / this.total;
    }
    /* Register a failure */

  }, {
    key: "failure",
    value: function failure(runTime) {
      this.total++;
      this.failed++;
      this.requestTimes.push(runTime);
    }
    /* Register a success */

  }, {
    key: "success",
    value: function success(runTime) {
      this.total++;
      this.successful++;
      this.requestTimes.push(runTime);
    }
    /* Register a short circuit */

  }, {
    key: "shortCircuit",
    value: function shortCircuit() {
      this.shortCircuited++;
    }
    /* Register a timeout */

  }, {
    key: "timeout",
    value: function timeout(runTime) {
      this.total++;
      this.timedOut++;
      this.requestTimes.push(runTime);
    }
  }]);

  return Bucket;
}();

module.exports = Bucket;