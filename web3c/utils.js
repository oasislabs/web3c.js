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
 * creates a promsie that can be resolved synchronously outside
 * the scope of the promise
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
 * creates an event emitter that also acts as a promise
 * to return a value for an asynchronous operation
 */
function createResolvableEmitter() {
  return resolvableEmitterFromPromise(createResolvablePromise);
}

/**
 * creates a resolvableEmitter from a promise
 */
function resolvableEmitterFromPromise(promise) {
  Emitter(promise);
  return promise;
}

module.exports = {
  objectAssign,
  createResolvablePromise,
  createResolvableEmitter,
  resolvableEmitterFromPromise,
};
