# brakes
[![Dependency Status](https://david-dm.org/awolden/brakes.svg)](https://david-dm.org/awolden/brakes)
[![Build Status](https://travis-ci.org/awolden/brakes.svg?branch=master)](https://travis-ci.org/awolden/brakes)
[![Coverage Status](https://coveralls.io/repos/github/awolden/brakes/badge.svg?branch=master)](https://coveralls.io/github/awolden/brakes?branch=master)
[![npm version](https://badge.fury.io/js/brakes.svg)](https://badge.fury.io/js/brakes)
[![Code Climate](https://codeclimate.com/github/awolden/brakes/badges/gpa.svg)](https://codeclimate.com/github/awolden/brakes)
[![bitHound Overall Score](https://www.bithound.io/github/awolden/brakes/badges/score.svg)](https://www.bithound.io/github/awolden/brakes)

A circuit breaker pattern for node.js.

**Requires Node 4.2.0 or higher**

[http://martinfowler.com/bliki/CircuitBreaker.html](http://martinfowler.com/bliki/CircuitBreaker.html)

[https://github.com/Netflix/Hystrix/wiki/How-it-Works](https://github.com/Netflix/Hystrix/wiki/How-it-Works)

[https://en.wikipedia.org/wiki/Circuit_breaker_design_pattern](https://en.wikipedia.org/wiki/Circuit_breaker_design_pattern)

---
- [Examples](#examples)
  - [Promise](#promise)
  - [Callback](#callback)
  - [Fallback](#fallback)
- [Events](#events)
- [Configuration](#configuration)
- [Stats](#stats)


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






Copyright (c) 2016, Alexander Wolden

Permission to use, copy, modify, and/or distribute this software for any purpose with or without fee is hereby granted, provided that the above copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
