'use strict';

const Brakes = require('../lib/Brakes');
const Circuit = require('../lib/Circuit');
const expect = require('chai').expect;
const sinon = require('sinon');
const TimeOutError = require('../lib/TimeOutError');
const CircuitBrokenError = require('../lib/CircuitBrokenError');

let brake;

const noop = function noop(foo, err, cb) {
  if (typeof err === 'function') {
    cb = err;
    err = null;
  }
  cb(err ? new Error(err) : null, foo);
};
const nopr = function nopr(foo, err) {
  return new Promise((resolve, reject) => {
    if (err) { reject(new Error(err)); }
    else { resolve(foo); }
  });
};
const slowpr = function slowpr(foo) {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve(foo);
    }, 50);
  });
};
const fbpr = function fallback(foo, err) {
  return new Promise(resolve => {
    resolve(foo || err);
  });
};
describe('Circuit Class', () => {
  afterEach(() => {
    if (brake instanceof Brakes) {
      brake.destroy();
      brake = undefined;
    }
  });
  it('Should construct with or without fallback and with or without options', () => {
    brake = new Brakes(noop);
    expect(brake).to.be.instanceof(Brakes);
    const circuit1 = new Circuit(brake, noop);
    expect(circuit1).to.be.instanceof(Circuit);
    const circuit2 = new Circuit(brake, noop, noop);
    expect(circuit2).to.be.instanceof(Circuit);
    const circuit3 = new Circuit(brake, noop, { timeout: 10 });
    expect(circuit3).to.be.instanceof(Circuit);
    const circuit4 = new Circuit(brake, noop, noop, { timeout: 10 });
    expect(circuit4).to.be.instanceof(Circuit);
  });
  it('Should promisify the service func', () => {
    brake = new Brakes(noop);
    const circuit = new Circuit(brake, noop);
    return circuit._serviceCall('test').then(result => {
      expect(result).to.equal('test');
    });
  });
  it('Should promisify and reject service func', () => {
    brake = new Brakes(noop);
    const circuit = new Circuit(brake, noop);
    return circuit._serviceCall(null, 'err').then(null, err => {
      expect(err).to.be.instanceof(Error);
      expect(err.message).to.equal('err');
    });
  });
  it('Should accept a promise', () => {
    brake = new Brakes(nopr);
    const circuit = new Circuit(brake, nopr);
    return circuit._serviceCall('test').then(result => {
      expect(result).to.equal('test');
    });
  });
  it('Should reject a promise', () => {
    brake = new Brakes(nopr);
    const circuit = new Circuit(brake, nopr);
    return circuit._serviceCall(null, 'err').then(null, err => {
      expect(err).to.be.instanceof(Error);
      expect(err.message).to.equal('err');
    });
  });
  it('Throw an error if not passed a Brake', () => {
    expect(() => {
      brake = new Brakes(noop);
      const circuit = new Circuit();
      circuit.test();
    }).to.throw();
  });
  it('Throw an error if not passed a Brake and a function', () => {
    expect(() => {
      brake = new Brakes(noop);
      const circuit = new Circuit(brake);
      circuit.test();
    }).to.throw();
  });
  it('Throw an error if not passed a Brake and not a function', () => {
    expect(() => {
      brake = new Brakes(noop);
      const circuit = new Circuit(brake, {});
      circuit.test();
    }).to.throw();
  });
  it('Throw an error if not passed a Brake and fallback not a function', () => {
    expect(() => {
      brake = new Brakes(noop);
      const circuit = new Circuit(brake, noop, {}, {});
      circuit.test();
    }).to.throw();
  });
  it('Should trigger event on exec', () => {
    brake = new Brakes(nopr);
    const circuit = new Circuit(brake, nopr);
    const spy = sinon.spy(() => {});
    brake.on('exec', spy);
    return circuit.exec('foo').then(result => {
      expect(result).to.equal('foo');
      expect(spy.calledOnce).to.equal(true);
    });
  });
  it('Should Resolve a service call and trigger event', () => {
    brake = new Brakes(nopr);
    const circuit = new Circuit(brake, nopr);
    const spy = sinon.spy(() => {});
    brake.on('success', spy);
    return circuit.exec('foo').then(result => {
      expect(result).to.equal('foo');
      expect(spy.calledOnce).to.equal(true);
    });
  });
  it('Should Reject a service call and trigger event', () => {
    brake = new Brakes(noop);
    const circuit = new Circuit(brake, noop);
    const spy = sinon.spy(() => {});
    brake.on('failure', spy);
    return circuit.exec(null, 'err').then(null, err => {
      expect(err).to.be.instanceof(Error);
      expect(err.message).to.equal('err');
      expect(spy.calledOnce).to.equal(true);
    });
  });
  it('Should timeout a service call and trigger event', () => {
    brake = new Brakes(noop);
    const circuit = new Circuit(brake, slowpr, { timeout: 1 });
    const spy = sinon.spy(() => {});
    brake.on('timeout', spy);
    return circuit.exec(null, 'err').then(null, err => {
      expect(err).to.be.instanceof(TimeOutError);
      expect(spy.calledOnce).to.equal(true);
    });
  });
  it('Should timeout a service call and trigger event (brake override)', () => {
    brake = new Brakes(noop, { timeout: 1 });
    const circuit = new Circuit(brake, slowpr);
    const spy = sinon.spy(() => {});
    brake.on('timeout', spy);
    return circuit.exec(null, 'err').then(null, err => {
      expect(err).to.be.instanceof(TimeOutError);
      expect(spy.calledOnce).to.equal(true);
    });
  });
  it('Should call fallback if circuit is broken', () => {
    brake = new Brakes(nopr);
    const circuit = new Circuit(brake, nopr, fbpr);
    brake._circuitOpen = true;
    return circuit.exec('test').then(result => {
      expect(result).to.equal('test');
    });
  });
  it('Fallback should cascade fail', () => {
    brake = new Brakes(nopr);
    const circuit = new Circuit(brake, nopr, noop);
    return circuit.exec(null, 'err').then(null, err => {
      expect(err).to.be.instanceof(Error);
      expect(err.message).to.equal('err');
    });
  });
  it('Fallback should succeed', () => {
    brake = new Brakes(nopr);
    const circuit = new Circuit(brake, nopr, fbpr);
    return circuit.exec(null, 'thisShouldFailFirstCall').then(result => {
      expect(result).to.equal('thisShouldFailFirstCall');
    });
  });
  it('Should if circuit is broken and no fallback', () => {
    brake = new Brakes(nopr);
    const circuit = new Circuit(brake, nopr);
    brake._circuitOpen = true;
    return circuit.exec('test').then(null, err => {
      expect(err).to.be.instanceof(CircuitBrokenError);
    });
  });
});
