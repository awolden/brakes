'use strict';

const callbacks = ['cb', 'callback', 'callback_', 'done'];

function hasCallback(fn) {
  const args = getFnArgs(fn);
  const callbackCandidate = args[args.length - 1];
  return callbacks.indexOf(callbackCandidate) > -1;
}

/*
 * Return a list arguments for a function
 */
function getFnArgs(fn) {
  const args = fn.toString().match(/^[function\s]?.*?\(([^)]*)\)/)[1];

  // Split the arguments string into an array comma delimited.
  return args.split(', ')
    .map((arg) => arg.replace(/\/\*.*\*\//, '').trim())
    .filter((arg) => arg);
}

module.exports = {
  callbacks,
  hasCallback,
  getFnArgs
};
