'use strict';

const stream = require('stream');


class GlobalStats {

  constructor() {
    this.brakesInstances = [];
    this.rawStream = new stream.Readable();
    this.rawStream._read = () => {};
    this.hysterixStream = new stream.Transform();
  }

  /* return number of instances being tracked */
  instanceCount() {
    return this.brakesInstances.length;
  }

  /* register a new instance apply listener */
  register(instance) {
    this.brakesInstances.push(instance);
    instance.on('snapshot', this._globalListener.bind(this));
  }

  /* deregister an existing instance and remove listener */
  deregister(instance) {
    const idx = this.brakesInstances.indexOf(instance);
    if (idx > -1) {
      this.brakesInstances.splice(idx, 1);
    }
    instance.removeListener('snapshot', this._globalListener.bind(this));
  }

  /* listen to event and pipe to stream */
  _globalListener(stats) {
    if (!stats || typeof stats !== 'object') return;
    this.rawStream.push(JSON.stringify(stats));
  }

  /* listen to event and pipe to stream */
  getHysterixStream() {
    return this.hysterixStream;
  }

  /* listen to event and pipe to stream */
  getRawStream() {
    return this.rawStream;
  }
}

module.exports = new GlobalStats();
