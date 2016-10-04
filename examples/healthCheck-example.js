'use strict';

const Brakes = require('../lib/Brakes');

const timer = 100;
let successRate = 2;
let iterations = 0;

function unreliableServiceCall() {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      iterations++;
      if (iterations === 10) {
        successRate = 0.6;
      }
      else if (iterations === 100) {
        successRate = 0.1;
      }
      else if (iterations === 200) {
        successRate = 1;
      }

      if (Math.random() <= successRate) {
        resolve();
      }
      else {
        reject('Service Unavailable');
      }
    }, timer);
  });
}

function anotherServiceCall() {
  return Promise.resolve();
}

const brake = new Brakes(unreliableServiceCall, {
  statInterval: 2500,
  threshold: 0.5,
  circuitDuration: 15000,
  timeout: 250,
  healthCheckInterval: 500
});

brake.on('snapshot', snapshot => {
  console.log('Running at:', snapshot.stats.successful / snapshot.stats.total);
  console.log(snapshot);
});

brake.on('circuitOpen', () => {
  console.log('----------Circuit Opened--------------');
});

brake.on('circuitClosed', () => {
  console.log('----------Circuit Closed--------------');
});

brake.on('healthCheckFailed', err => {
  console.log('--------Health check failed-----------', err || '');
});

brake.fallback(() => {
  console.log('Fallback');
  return Promise.resolve();
});

brake.healthCheck(() => {
  console.log('checking health');
  // in real world scenario, the health check should be done on a less load intensive way,
  // like calling a function on server with the less data (like getting the version info),
  // of trying to create a connection for mongodb
  const healthCheckCalls = [unreliableServiceCall(), unreliableServiceCall(), anotherServiceCall()];

  // health criteria = 2 times successful service calls to unreliableServiceCall and one to anotherServiceCall
  return Promise.all(healthCheckCalls)
      .then(results => console.log(`health check success ${results}`));
});

setInterval(() => {
  brake.exec()
    .then(() => {
      console.log('Successful');
    })
    .catch(err => {
      // this line should not be hit, as there is a fallback function
      // (unless fallback is also failing)
      console.log('Failure', err || '');
    });
}, 100);
