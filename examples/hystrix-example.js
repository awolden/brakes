'use strict';

const Brakes = require('../lib/Brakes');
const http = require('http');
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


const brake = new Brakes(unreliableServiceCall, {
  statInterval: 2500,
  threshold: 0.5,
  circuitDuration: 15000,
  timeout: 250
});

const globalStats = Brakes.getGlobalStats();

/*
Create SSE Hysterix compliant Server
*/
http.createServer((req, res) => {
  res.setHeader('Content-Type', 'text/event-stream;charset=UTF-8');
  res.setHeader('Cache-Control', 'no-cache, no-store, max-age=0, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  globalStats.getHystrixStream().pipe(res);
}).listen(8081, () => {
  console.log('---------------------');
  console.log('Hysterix Server now live at localhost:8081/hystrix.stream');
  console.log('---------------------');
});

setInterval(() => {
  brake.exec()
    .then(() => {})
    .catch(() => {});
}, 100);
