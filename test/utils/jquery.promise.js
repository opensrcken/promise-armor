var JQDeferred = require('JQDeferred');

/**
 * causes jQuery promises to behave as expected when resolved with another promise
 *
 * @param resolverFn
 * @returns {Function}
 */
var generateRecursiveResolutionFn = function (resolverFn, rejecterFn) {
  return function (result) {
    if (result && result.then) {
      result.then(generateRecursiveResolutionFn(resolverFn, rejecterFn), rejecterFn);
    } else {
      resolverFn(result);
    }
  }
};

var PromiseImplementation = function (fn) {
  var self = this;
  this.deferred = JQDeferred();
  this.promise = this.deferred.promise();
  fn(generateRecursiveResolutionFn(this.deferred.resolve.bind(this), this.deferred.reject), this.deferred.reject);
  this.resolution;

  var self = this;
  this.promise.then(function (result) {
    self.resolution = result;
  });

  this.promise.fail(function (result) {
    self.resolution = result;
  });
};

// TOOD: test this
PromiseImplementation.all = function (promiseArray) {
  return new PromiseImplementation(function (resolve, reject) {
    $.when.apply($, promiseArray).then(function () {
      var args = Array.prototype.slice.apply(arguments);
      var recursivePromises = args.any(function(result) {
        return result.then;
      });

      if (recursivePromises) {
        resolve(PromiseImplementation.all(args));
      } else {
        resolve(args);
      }
    }, reject);
  });
};

/**
 * TODO: BROKEN! this needs a lot of work to conform to spec.
 *   cannot resolve a promise with another promise,
 *   as it stands.
 *
 * @param fn
 * @param fn2
 * @returns {PromiseImplementation}
 */
PromiseImplementation.prototype.then = function (fn, fn2) {
  var self = this;

  this.promise = this.promise.then(function (result) {
    if (result && result.then) {
      self.promise = result;
      result.then(fn, fn2);
    } else {
      fn(result);
    }
  }, fn2);

  return this;
};

PromiseImplementation.prototype.caught = PromiseImplementation.prototype['catch'] = function (fn) {
  this.promise = this.promise.fail(fn);
  return this;
};

PromiseImplementation.prototype.finally = function (fn) {
  this.promise = this.promise.always(fn);
  return this;
};

PromiseImplementation.prototype.done = function (fn) {
  this.promise = this.promise.done(fn);
  return this;
};

PromiseImplementation.prototype.isFulfilled = function () {
  return this.deferred.state() === "resolved";
};

PromiseImplementation.prototype.isRejected = function () {
  return this.deferred.state() === "rejected";
};

PromiseImplementation.prototype.getResolution = function () {
  return this.resolution;
};

module.exports = PromiseImplementation;
