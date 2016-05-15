'use strict';

const stream = require('stream');
const mapToHystrixJson = require('./utils').mapToHystrixJson;


class GlobalStats {

  constructor() {
    this._brakesInstances = [];

    // create raw stream
    this._rawStream = new stream.Readable({
      objectMode: true
    });
    this._rawStream._read = () => {};

    // create hysterix stream
    this._hystrixStream = new stream.Transform({
      objectMode: true
    });
    this._hystrixStream._transform = this._transformToHysterix;

    // connect the streams
    this._rawStream.pipe(this._hystrixStream);
  }

  /* return number of instances being tracked */
  instanceCount() {
    return this._brakesInstances.length;
  }

  /* register a new instance apply listener */
  register(instance) {
    this._brakesInstances.push(instance);
    instance.on('snapshot', this._globalListener.bind(this));
  }

  /* deregister an existing instance and remove listener */
  deregister(instance) {
    const idx = this._brakesInstances.indexOf(instance);
    if (idx > -1) {
      this._brakesInstances.splice(idx, 1);
    }
    instance.removeListener('snapshot', this._globalListener.bind(this));
  }

  /* listen to event and pipe to stream */
  _globalListener(stats) {
    if (!stats || typeof stats !== 'object') return;
    this._rawStream.push(JSON.stringify(stats));
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
    return this._hystrixStream;
  }

  /* listen to event and pipe to stream */
  getRawStream() {
    return this._rawStream;
  }
}

module.exports = new GlobalStats();
