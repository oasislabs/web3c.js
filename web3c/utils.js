var Emitter = require('component-emitter');

/**
 * objectAssign is an alternative to Object.assign to work with react-native.
 * Assigns all properties from b onto a as readonly by default.
 */
function objectAssign(a, b, enumerable = true, writable = false) {
  Object.keys(b).forEach((key) => {
    Object.defineProperty(a, key, {
      value: b[key],
      enumerable,
      writable
    });
  });
}

/**
 * Creates a promsie that can be resolved synchronously outside
 * the scope of the promise.
 */
function createResolvablePromise() {
  const resolver = {};
  const promise = new Promise((resolve, reject) => {
    resolver.resolve = resolve;
    resolver.reject = reject;
  });
  promise.resolver = resolver;
  return promise;
}

/**
 * Creates an event emitter that also acts as a promise
 * to return a value for an asynchronous operation.
 */
function createResolvableEmitter() {
  return resolvableEmitterFromPromise(createResolvablePromise());
}

/**
 * Creates a resolvableEmitter from a promise.
 */
function resolvableEmitterFromPromise(promise) {
  Emitter(promise);
  return promise;
}

/**
 * @returns true if the result is an empty object
 *          false otherwise. It will throw an error if the
 *          argument is not an object, null or undefined
 */
function isEmptyObject(o) {
  if (o === null || o === undefined) {
    return true;
  }

  if (typeof o !== 'object') {
    throw new Error('provided argument must be an object');
  }

  for (const key in o) {
    if (o.hasOwnProperty(key)) {
      return false;
    }
  }

  return true;
}

/**
 * @returns false if the result is an empty object
 *          true otherwise. It will throw an error if the
 *          argument is not an object, null or undefined.
 */
function isNotEmptyObject(o) {
  return !isEmptyObject(o);
}

/**
 * Copies class methods from the given Web3 object to the Web3c object.
 */
function web3CopyMethods(Web3c, Web3) {
  Web3c.providers = Web3.providers;
  Web3c.utils = Web3.utils;
}

module.exports = {
  objectAssign,
  createResolvablePromise,
  createResolvableEmitter,
  resolvableEmitterFromPromise,
  isEmptyObject,
  isNotEmptyObject,
  web3CopyMethods
};
