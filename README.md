# brakes
[![Dependency Status](https://david-dm.org/awolden/brakes.svg)](https://david-dm.org/awolden/brakes)
[![Build Status](https://travis-ci.org/awolden/brakes.svg?branch=master)](https://travis-ci.org/awolden/brakes)

A circuit breaker pattern for node.js.

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
