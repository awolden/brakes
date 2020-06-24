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
        reject();
      }
    }, timer);
  });
}


// Create a main brakes instance with no main function
const brake = new Brakes({
  statInterval: 2500,
  threshold: 0.5,
  circuitDuration: 15000,
  timeout: 250,
  fallback: () => Promise.resolve('Fallback data')
});

// create sub circuits
const circuit1 = brake.subCircuit(unreliableServiceCall, { timeout: 500 });
const circuit2 = brake.subCircuit(unreliableServiceCall, { timeout: 1000 });

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

setInterval(() => {
  circuit1.exec()
    .then(data => {
      console.log(data || 'C1 Succesful');
    })
    .catch(err => {
      console.log('C1 Failure', err || '');
    });
}, 100);

setInterval(() => {
  circuit2.exec()
    .then(data => {
      console.log(data || 'C2 Succesful');
    })
    .catch(err => {
      console.log('C2 Failure', err || '');
    });
}, 500);
