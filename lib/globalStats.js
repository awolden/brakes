'use strict';

const stream = require('stream');
const mapToHystrixJson = require('./utils').mapToHystrixJson;


class GlobalStats {

  constructor() {
    this.brakesInstances = [];

    // create raw stream
    this.rawStream = new stream.Readable({
      objectMode: true
    });
    this.rawStream._read = () => {};

    // create hysterix stream
    this.hystrixStream = new stream.Transform({
      objectMode: true
    });
    this.hystrixStream._transform = this._transformToHysterix;

    // connect the streams
    this.rawStream.pipe(this.hystrixStream);
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

  /* transform stats object into hystrix object */
  _transformToHysterix(stats, encoding, callback) {
    if (!stats || typeof stats !== 'string') return stats;
    let rawStats;
    let mappedStats;
    try {
      rawStats = JSON.parse(stats);
      mappedStats = mapToHystrixJson(rawStats);
    }
    catch (err) {
      return callback(err);
    }
    return callback(null, `data: ${JSON.stringify(mappedStats)}\n\n`);
  }

  /* listen to event and pipe to stream */
  getHystrixStream() {
    return this.hystrixStream;
  }

  /* listen to event and pipe to stream */
  getRawStream() {
    return this.rawStream;
  }
}

module.exports = new GlobalStats();
