'use strict';

module.exports = TimeOutError;

class TimeOutError extends Error {
  constructor() {
    super.apply(null, arguments);
  }
}
