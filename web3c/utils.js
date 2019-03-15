/**
 * objectAssign is an alternative to Object.assign to work with react-native.
 * Assigns all properties from b onto a.
 */
function objectAssign(a, b, enumerable = true) {
  Object.keys(b).forEach((key) => {
    Object.defineProperty(a, key, {
      value: b[key],
      enumerable,
    });
  });
}

module.exports = {
  objectAssign
}
