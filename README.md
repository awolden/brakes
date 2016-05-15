[![Dependency Status](https://david-dm.org/awolden/brakes.svg)](https://david-dm.org/awolden/brakes)
[![Build Status](https://travis-ci.org/awolden/brakes.svg?branch=master)](https://travis-ci.org/awolden/brakes)
[![Coverage Status](https://coveralls.io/repos/github/awolden/brakes/badge.svg?branch=master)](https://coveralls.io/github/awolden/brakes?branch=master)
[![npm version](https://badge.fury.io/js/brakes.svg)](https://badge.fury.io/js/brakes)
[![Code Climate](https://codeclimate.com/github/awolden/brakes/badges/gpa.svg)](https://codeclimate.com/github/awolden/brakes)
[![bitHound Overall Score](https://www.bithound.io/github/awolden/brakes/badges/score.svg)](https://www.bithound.io/github/awolden/brakes)
[![contributions welcome](https://img.shields.io/badge/contributions-welcome-brightgreen.svg?style=flat)](https://github.com/awolden/brakes/issues)
[![badges](https://img.shields.io/:badges-8/8-32B90E.svg)](https://img.shields.io/:badges-8/8-32B90E.svg)



brakes
===

A circuit breaker pattern for nodejs. A circuit breaker provides latency and fault protection for distributed systems. Brakes will monitor your outgoing requests, and will trip and internal circuit if it begins to detect that the remote service is beginning to fail. This module is largely based on Netflix's [Hystrix](https://github.com/Netflix/Hystrix)

**Requires Node 4.2.0 or higher**

[http://martinfowler.com/bliki/CircuitBreaker.html](http://martinfowler.com/bliki/CircuitBreaker.html)

[https://github.com/Netflix/Hystrix/wiki/How-it-Works](https://github.com/Netflix/Hystrix/wiki/How-it-Works)

[https://en.wikipedia.org/wiki/Circuit_breaker_design_pattern](https://en.wikipedia.org/wiki/Circuit_breaker_design_pattern)

---
- [Bluebird and Promisify](#bluebird-and-promisify)
- [Examples](#examples)
  - [Promise](#promise)
  - [Callback](#callback)
  - [Fallback](#fallback)
- [Methods](#methods)
- [Events](#events)
- [Configuration](#configuration)
- [Stats](#stats)
- [Hystrix Dashboard](#hystrix-dashboard)
- [Development](#development)

### Bluebird and Promisify

  **Bluebird**

  This module utilizes bluebird promises. For more on the features of bluebird visit their site: [http://bluebirdjs.com/](http://bluebirdjs.com/). Brakes uses bluebird over native promises in order to provide more feature rich promises and because bluebird offers performance comparable to that of raw callbacks.

  **Promisify**

  If you pass an async function that relies on callback, brakes will promisify it into a bluebird promise. If you pass a promise to brakes, it will use that promise as is.

  *Note: brakes will only detect async callback functions that use callbacks with one of the following names: `cb`, `callback`, `callback_`, or `done`.*

## Examples
### Promise

```javascript
  function promiseCall(foo){
    return new Promise((resolve, reject) =>{
      if (foo) resolve(foo);
      else reject(foo);
    });
  }

  const brake = new Brakes(promiseCall, {timeout: 150});

  brake.exec('bar')
    .then((result) =>{
      console.log(`result: ${result}`);
    })
    .catch(err =>{
      console.error(`error: ${err}`);
    });
```

### Callback

```javascript
  function asyncCall(foo, cb){
    if (foo) cb(null, foo);
    else cb(new Error(foo));
  }

  const brake = new Brakes(asyncCall, {timeout: 150});

  brake.exec('bar')
    .then((result) =>{
      console.log(`result: ${result}`);
    })
    .catch(err =>{
      console.error(`error: ${err}`);
    });
```

### Fallback

```javascript
  function promiseCall(foo){
    return new Promise((resolve, reject) =>{
      if (foo) resolve(foo);
      else reject(foo);
    });
  }

  function fallbackCall(foo){
    return new Promise((resolve, reject) =>{
      resolve('I always succeed');
    });
  }

  const brake = new Brakes(promiseCall, {timeout: 150});

  brake.fallback(fallbackCall)

  brake.exec(false)
    .then((result) =>{
      console.log(`result: ${result}`);
    })
    .catch(err =>{
      console.error(`error: ${err}`);
    });
```

### Demonstration

For a terminal based demonstration:

**General Demo**
`npm install && node examples/example1.js`

**Hystrix Stream Demo**
`npm install && node examples/hystrix-example.js`

## Methods
Method | Argument(s) | Returns | Description 
---|---|---|---
getGlobalStats|N/A| globalStats| Returns a reference to the global stats tracker
*static* getGlobalStats|globalStats|N/A|Returns a reference to the global stats tracker
exec|N/A|Promise|Executes the circuit
fallback|function (must return promise or accept callback)|N/A|Registers a fallback function for the circuit
on|eventName, function|N/A|Register an event listener
destroy|N/A|N/A|Removes all listeners and deregisters with global stats tracker.
isOpen|N/A|boolean|Returns `true` if circuit is open

## Events
  Every brake is an instance of `EventEmitter` that provides the following events:

  - **failure**: Event on request failure
  - **success**: Event on request success
  - **timeout**: Event on request timeout
  - **circuitClosed**: Event fired when circuit is closed
  - **circuitOpen**: Event fired when circuit is open
  - **snapshot**: Event fired on stats snapshot

## Configuration
  Available configuration options.
- **name**: `string` to use for name of circuit. This is mostly used for reporting on stats.
- **group**: `string` to use for group of circuit. This is mostly used for reporting on stats.
- **bucketSpan**: time in `ms` that a specific bucket should remain active
- **statInterval**: interval in `ms` that brakes should emit a `snapshot` event
- **percentiles**: `array<number>` that defines the percentile levels that should be calculated on the stats object (i.e. 0.9 for 90th percentile)
- **bucketNum**: `#` of buckets to retain in a rolling window
- **circuitDuration**: time in `ms` that a circuit should remain broken
- **waitThreshold**: `number` of requests to wait before testing circuit health
- **threshold**: `%` threshold for successful calls. If the % of successful calls dips below this threshold the circuit will break
- **timeout**: time in `ms` before a service call will timeout

## Stats
Based on the `opts.statInterval` an event will be fired at regular intervals that contains a snapshot of the running state of the application.

```javascript
// ...
  brake.on('snapshot', snapshot => {
    console.log(`Stats received -> ${snapshot}`);
  });
// ...
```

**Example Stats Object**

```javascript
{ name: 'defaultBrake',
  group: 'defaultBrakeGroup',
  time: 1463297869298,
  circuitDuration: 15000,
  threshold: 0.5,
  waitThreshold: 100,
  stats:
   { failed: 0,
     timedOut: 0,
     total: 249,
     latencyMean: 100,
     successful: 249,
     percentiles:
      { '0': 100,
        '1': 102,
        '0.25': 100,
        '0.5': 100,
        '0.75': 101,
        '0.9': 101,
        '0.95': 102,
        '0.99': 102,
        '0.995': 102 }
    }
  }
```

**Global Stats Stream**

Brakes automatically tracks all created instances of brakes and provides a global stats stream for easy consumption and reporting on all brakes instances. These streams will aggregate all stat events into one single stream.

```javascript
const globalStats = Brakes.getGlobalStats();

globalStats.getRawStream().on('data', (stats) =>{
  console.log('received global stats ->', stats);
});
```

## Hystrix Dashboard

Using the global stats stream with a special transform, brakes makes it incredibly easy to generate a SSE stream that is compliant with the hystrix dashboard and turbine.

**Example:**
```javascript
const globalStats = Brakes.getGlobalStats();

/*
Create SSE Hystrix compliant Server
*/
http.createServer((req, res) => {
  res.setHeader('Content-Type', 'text/event-stream;charset=UTF-8');
  res.setHeader('Cache-Control', 'no-cache, no-store, max-age=0, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  globalStats.getHystrixStream().pipe(res);
}).listen(8081, () => {
  console.log('---------------------');
  console.log('Hystrix Stream now live at localhost:8081/hystrix.stream');
  console.log('---------------------');
});
```

Addtional Reading: [Hystrix Metrics Event Stream](https://github.com/Netflix/Hystrix/tree/master/hystrix-contrib/hystrix-metrics-event-stream), [Turbine](https://github.com/Netflix/Turbine/wiki), [Hystrix Dashboard](https://github.com/Netflix/Hystrix/wiki/Dashboard)

===
## Development

We gladly welcome pull requests and code contributions. To develop brakes locally clone the repo and use the following commands to aid in development:

```
npm install
npm run test
npm run test:lint
npm run coverage
```

---
Copyright (c) 2016

Permission to use, copy, modify, and/or distribute this software for any purpose with or without fee is hereby granted, provided that the above copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
