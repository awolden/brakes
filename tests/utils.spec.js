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
  describe('mapToHystrixJson', () => {
    it('should map to hysterix compliant object', () => {
      const statsOutput = {
        name: 'defaultBrake',
        group: 'defaultBrakeGroup',
        time: 1463292683341,
        circuitDuration: 100,
        threshold: 0.5,
        stats: {
          failed: 4,
          timedOut: 0,
          total: 23,
          successful: 19,
          percentiles: {
            0: 100,
            1: 103,
            0.25: 100,
            0.5: 100,
            0.75: 101,
            0.9: 101,
            0.95: 102,
            0.99: 103,
            0.995: 103
          }
        }
      };
      const stats = statsOutput.stats;
      expect(utils.mapToHystrixJson(statsOutput)).to.eql({
        type: 'HystrixCommand',
        name: 'defaultBrake',
        group: 'defaultBrakeGroup',
        currentTime: 1463292683341,
        isCircuitBreakerOpen: false, // TODO
        errorPercentage: stats.failed / stats.total,
        errorCount: stats.failed,
        requestCount: stats.total,
        rollingCountCollapsedRequests: 0, // not reported
        rollingCountExceptionsThrown: 0, // not reported
        rollingCountFailure: stats.failed,
        rollingCountFallbackFailure: 0, // not reported
        rollingCountFallbackRejection: 0, // not reported
        rollingCountFallbackSuccess: 0, // not reported
        rollingCountResponsesFromCache: 0, // not reported
        rollingCountSemaphoreRejected: 0, // not reported
        rollingCountShortCircuited: 0, // not reported
        rollingCountSuccess: stats.successful,
        rollingCountThreadPoolRejected: 0, // not reported
        rollingCountTimeout: stats.timedout,
        currentConcurrentExecutionCount: 0, // not reported
        latencyExecute_mean: 13, // todo
        latencyExecute: {
          0: stats.percentiles['0'],
          25: stats.percentiles['0.25'],
          50: stats.percentiles['0.50'],
          75: stats.percentiles['0.75'],
          90: stats.percentiles['0.90'],
          95: stats.percentiles['0.95'],
          99: stats.percentiles['0.99'],
          99.5: stats.percentiles['0.995'],
          100: stats.percentiles['1']
        },
        latencyTotal_mean: 15,
        latencyTotal: {
          0: stats.percentiles['0'],
          25: stats.percentiles['0.25'],
          50: stats.percentiles['0.50'],
          75: stats.percentiles['0.75'],
          90: stats.percentiles['0.90'],
          95: stats.percentiles['0.95'],
          99: stats.percentiles['0.99'],
          99.5: stats.percentiles['0.995'],
          100: stats.percentiles['1']
        },
        propertyValue_circuitBreakerRequestVolumeThreshold: 0,
        propertyValue_circuitBreakerSleepWindowInMilliseconds: statsOutput.circuitDuration,
        propertyValue_circuitBreakerErrorThresholdPercentage: statsOutput.threshold,
        propertyValue_circuitBreakerForceOpen: false, // not reported
        propertyValue_circuitBreakerForceClosed: false, // not reported
        propertyValue_circuitBreakerEnabled: true, // not reported
        propertyValue_executionIsolationStrategy: 'THREAD', // not reported
        propertyValue_executionIsolationThreadTimeoutInMilliseconds: 800, // not reported
        propertyValue_executionIsolationThreadInterruptOnTimeout: true, // not reported
        propertyValue_executionIsolationThreadPoolKeyOverride: null, // not reported
        propertyValue_executionIsolationSemaphoreMaxConcurrentRequests: 20, // todo
        propertyValue_fallbackIsolationSemaphoreMaxConcurrentRequests: 10, // todo
        propertyValue_metricsRollingStatisticalWindowInMilliseconds: 10000, // todo
        propertyValue_requestCacheEnabled: false, // not reported
        propertyValue_requestLogEnabled: false, // not reported
        reportingHosts: 1 // not reported
      });
    });
  });

});
