/**
 * objectAssign is an alternative to Object.assign to work with react-native.
 * Assigns all properties from b onto a as readonly by default.
 */
function objectAssign(a, b, enumerable = true, writeable = false) {
  Object.keys(b).forEach((key) => {
    Object.defineProperty(a, key, {
      value: b[key],
      enumerable,
      writeable
    });
  });
}

module.exports = {
  objectAssign
}
