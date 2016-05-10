'use strict';

const utils = require('../lib/utils');
const expect = require('chai').expect;


describe('utils', () => {

  describe('hasCallback', () => {
    it('should return true', () => {
      // standard
      let passed = utils.hasCallback(function test(err, cb) { // eslint-disable-line
        cb();
      });
      expect(passed).to.equal(true);

      // anonymous
      passed = utils.hasCallback((err, callback) => {
        callback();
      });
      expect(passed).to.equal(true);

      // class
      class FakeClass {
        foo(err, done) {
          done();
        }
      }
      const fakey = new FakeClass();
      passed = utils.hasCallback(fakey.foo);
      expect(passed).to.equal(true);
    });

    it('should return false', () => {
      // standard
      let passed = utils.hasCallback(function bleh(test) { /* foo */ }); // eslint-disable-line
      expect(passed).to.equal(false);

      // anonymous
      passed = utils.hasCallback(() => {});
      expect(passed).to.equal(false);

      // class
      class FakeClass {
        foo() {}
      }
      const fakey = new FakeClass();
      passed = utils.hasCallback(fakey.foo);
      expect(passed).to.equal(false);
    });

  });
  describe('getFnArgs', () => {
    it('should return a list of arguments', () => {
      function foo(one, two, three, cb) {
        one = two = three = cb;
      }
      expect(utils.getFnArgs(foo)).to.eql(['one', 'two', 'three', 'cb']);
    });
  });

});
