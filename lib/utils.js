'use strict';

const Promise = require('bluebird');

const callbacks = ['cb', 'callback', 'callback_', 'done'];

function hasCallback(fn) {
  const args = getFnArgs(fn);
  const callbackCandidate = args[args.length - 1];
  return callbacks.indexOf(callbackCandidate) > -1;
}

function promisifyIfFunction(fn, isPromise, isFunction) {
  if (isPromise) {
    return fn;
  }

  if (isFunction || hasCallback(fn)) {
    return Promise.promisify(fn);
  }

  return fn;
}

/*
 * Return a list arguments for a function
 */
function getFnArgs(fn) {
  const match = fn.toString().match(/^[function\s]?.*?\(([^)]*)\)/);
  let args = '';
  if (!match) {
    const matchSingleArg = fn.toString().match(/^([^)]*) =>/);
    if (matchSingleArg) {
      args = matchSingleArg[1];
    }
  }
  else {
    args = match[1];
  }

  // Split the arguments string into an array comma delimited.
  return args.split(', ')
    .map(arg => arg.replace(/\/\*.*\*\//, '').trim())
    .filter(arg => arg);
}

/*
 * Map a brakes stats object to a hystrix stats object
 */
function mapToHystrixJson(json) {
  const stats = json.stats;
  return {
    type: 'HystrixCommand',
    name: json.name,
    group: json.group,
    currentTime: json.time,
    isCircuitBreakerOpen: json.open,
    errorPercentage: (stats.total) ? Math.round((1 - stats.successful / stats.total) * 100) : 0,
    errorCount: stats.failed,
    requestCount: stats.total,
    rollingCountBadRequests: 0, // not reported
    rollingCountCollapsedRequests: 0, // not reported
    rollingCountExceptionsThrown: 0, // not reported
    rollingCountFailure: stats.failed,
    rollingCountFallbackFailure: 0, // not reported
    rollingCountFallbackRejection: 0, // not reported
    rollingCountFallbackSuccess: 0, // not reported
    rollingCountResponsesFromCache: 0, // not reported
    rollingCountSemaphoreRejected: 0, // not reported
    rollingCountShortCircuited: stats.shortCircuited, // not reported
    rollingCountSuccess: stats.successful,
    rollingCountThreadPoolRejected: 0, // not reported
    rollingCountTimeout: stats.timedOut,
    currentConcurrentExecutionCount: 0, // not reported
    latencyExecute_mean: stats.latencyMean,
    latencyExecute: {
      0: stats.percentiles['0'],
      25: stats.percentiles['0.25'],
      50: stats.percentiles['0.5'],
      75: stats.percentiles['0.75'],
      90: stats.percentiles['0.9'],
      95: stats.percentiles['0.95'],
      99: stats.percentiles['0.99'],
      99.5: stats.percentiles['0.995'],
      100: stats.percentiles['1']
    },
    latencyTotal_mean: 15,
    latencyTotal: {
      0: stats.percentiles['0'],
      25: stats.percentiles['0.25'],
      50: stats.percentiles['0.5'],
      75: stats.percentiles['0.75'],
      90: stats.percentiles['0.9'],
      95: stats.percentiles['0.95'],
      99: stats.percentiles['0.99'],
      99.5: stats.percentiles['0.995'],
      100: stats.percentiles['1']
    },
    propertyValue_circuitBreakerRequestVolumeThreshold: json.waitThreshold,
    propertyValue_circuitBreakerSleepWindowInMilliseconds: json.circuitDuration,
    propertyValue_circuitBreakerErrorThresholdPercentage: json.threshold,
    propertyValue_circuitBreakerForceOpen: false, // not reported
    propertyValue_circuitBreakerForceClosed: false, // not reported
    propertyValue_circuitBreakerEnabled: true, // not reported
    propertyValue_executionIsolationStrategy: 'THREAD', // not reported
    propertyValue_executionIsolationThreadTimeoutInMilliseconds: 800, // not reported
    propertyValue_executionIsolationThreadInterruptOnTimeout: true, // not reported
    propertyValue_executionIsolationThreadPoolKeyOverride: null, // not reported
    propertyValue_executionIsolationSemaphoreMaxConcurrentRequests: 20, //  not reported
    propertyValue_fallbackIsolationSemaphoreMaxConcurrentRequests: 10, //  not reported
    propertyValue_metricsRollingStatisticalWindowInMilliseconds: 10000, //  not reported
    propertyValue_requestCacheEnabled: false, // not reported
    propertyValue_requestLogEnabled: false, // not reported
    reportingHosts: 1 // not reported
  };
}

module.exports = {
  callbacks,
  hasCallback,
  promisifyIfFunction,
  getFnArgs,
  mapToHystrixJson
};
