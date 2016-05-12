# brakes
[![Dependency Status](https://david-dm.org/awolden/brakes.svg)](https://david-dm.org/awolden/brakes)
[![Build Status](https://travis-ci.org/awolden/brakes.svg?branch=master)](https://travis-ci.org/awolden/brakes)
[![Coverage Status](https://coveralls.io/repos/github/awolden/brakes/badge.svg?branch=master)](https://coveralls.io/github/awolden/brakes?branch=master)
[![npm version](https://badge.fury.io/js/brakes.svg)](https://badge.fury.io/js/brakes)
[![Code Climate](https://codeclimate.com/github/awolden/brakes/badges/gpa.svg)](https://codeclimate.com/github/awolden/brakes)
[![bitHound Overall Score](https://www.bithound.io/github/awolden/brakes/badges/score.svg)](https://www.bithound.io/github/awolden/brakes)

A circuit breaker pattern for nodejs. A circuit breaker provides latency and fault protection for distributed systems. Brakes will monitor your outgoing requests, and will fail quickly if a remote system fails to respond. This module is largely based on Netflix's [Hysterix](https://github.com/Netflix/Hystrix)

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
- [Events](#events)
- [Configuration](#configuration)
- [Stats](#stats)
- [Development](#development)

### Bluebird and Promisify

  ##### Bluebird

  This module utilizes bluebird promises. For more on the features of bluebird visit their site: [http://bluebirdjs.com/](http://bluebirdjs.com/). Brakes uses bluebird over native promises in order to provide more feature rich promises and because bluebird offers performance comparable to that of raw callbacks.

  ##### Promisify

  If you pass an async function that relies on callbacks to brakes it will promisify it into a bluebird promise. If you pass a promise to brakes, it will use that promise as is.


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

`npm install && node examples/example1.js`


## Events
  Every brake is an instance of `EventEmitter` that provides the following events:

  - **failure**: Event on request failure
  - **success**: Event on request success
  - **timeout**: Event on request timeout
  - **circuitBroken**: Event fired when circuit is broken
  - **circuitOpen**: Event fired when circuit is open
  - **snapshot**: Event fired on stats snapshot

## Configuration
  Available configuration options.
- **bucketSpan**: time in `ms` that a specific bucket should remain active
- **statInterval**: interval in `ms` that brakes should emit a `snapshot` event
- **percentiles**: `array<number>` that defines the percentile levels that should be calculated on the stats object (i.e. 0.9 for 90th percentile)
- **bucketNum**: `#` of buckets to retain in a rolling window
- **circuitDuration**: time in `ms` that a circuit should remain broken
- **startDelay**: delay in `ms` before a circuit breaker starts checking health of the circuit
- **threshold**: `%` threshold for successful calls. If the % of successful calls dips below this threshold the circuit will break
- **timeout**: time in `ms` before a service call will timeout

## Stats
Based on the `opts.statInterval` an event will be fired at regular intervals that contains a snapshot of the running state of the application.

```javascript
// ...
  brake.on('snapshot', stats => {
    console.log(`Stats received -> ${stats}`);
  });
// ...
```

## Development

We gladly welcome pull requests and code contributions. To develop brakes locally clone the repo and use the following commands to add in development:

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
