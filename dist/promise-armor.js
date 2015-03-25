(function(name, definition) {
  if (typeof module != 'undefined') module.exports = definition();
  else if (typeof define == 'function' && typeof define.amd == 'object') define(definition);
  else this[name] = definition();
}('PromiseArmor', function () {
  var getJitter = function (base, jitterFactor) {
    // at jitterFactor === 1, can as much as double the base exponentiation rate
    return Math.random() * base * jitterFactor;
  }

  var publicApi = [
    'method', 'props', 'resolve', 'reject', 'withTimeout', 'withRetry', 'withRetryAndTimeout', 'wrap'
  ];

  var standardizePromise = function (promiseProto) {
    promiseProto['caught'] = promiseProto['catch']; // since .catch will cause err in ie < 9
  }

  /**
   *
   * @param PromiseConstructor
   * @constructor
   */
  var PromiseArmor = function (PromiseConstructor) {
    standardizePromise(PromiseConstructor.prototype);
    this.promiseFactoryFn = function (cb) {
      return new PromiseConstructor(cb);
    }
  };

  PromiseArmor.extendPromise = function (Promise, doOverride) {
    var armor = new PromiseArmor(Promise);

    publicApi.forEach(function (fnName) {
      if (doOverride || !Promise[fnName]) {
        Promise[fnName] = armor[fnName].bind(armor);
      }
    });

    return Promise;
  };

  PromiseArmor.prototype.resolve = function (val) {
    return this.promiseFactoryFn(function (resolve) {
      resolve(val);
    });
  };

  PromiseArmor.prototype.reject = function (val) {
    return this.promiseFactoryFn(function (_, reject) {
      reject(val);
    });
  };

  // TODO: this can be expanded in the future. allow for caller to define method
  // by which failure message can be extracted from already-rejected promise.
  PromiseArmor.prototype.getPromiseState = function (promise) {
    return this.promiseFactoryFn(function (resolve, reject) {
      var self = this;

      if (!promise.then) {
        return resolve(promise);
      }

      if (promise.isFulfilled()) {
        resolve(promise.getResolution());
      } else if (promise.isRejected()) {
        reject(promise.getResolution());
      }

      promise.then(function () {
        resolve(promise.getResolution());
      }).caught(function () {
        reject(promise.getResolution());
      });
    });
  };

  /**
   * @param {Promise}  PromiseConstructor
   * @param {Boolean} isFactoryFn
   */
  PromiseArmor.prototype.setPromiseFactoryFn = function (PromiseConstructor, isFactoryFn) {
    if (isFactoryFn) {
      this.promiseFactoryFn = PromiseConstructor;
    } else {
      this.promiseFactoryFn = function (cb) {
        return new PromiseConstructor(cb);
      }
    }
  };

// punting on this for now, since ES6 and jQuery both provide this.
//
//PromiseArmor.prototype.all = function (promiseArray) {
//  var self = this;
//
//  return this.promiseFactoryFn(function (resolve, reject) {
//    var counter = 0;
//    var results = [];
//
//    promiseArray.forEach(function (promise, idx) {
//      ++counter;
//
//      self.getPromiseState(promise).then(function (result) {
//        results[idx] = result;
//        if (--counter === 0) {
//          resolve(results);
//        }
//      }).caught(function (err) {
//        reject(err);
//      });
//    });
//  });
//};

  PromiseArmor.prototype.props = function (promiseHash) {
    var self = this;

    return this.promiseFactoryFn(function (resolve, reject) {
      var counter = 0;
      var results = {};

      if (!promiseHash || typeof promiseHash === "string" || typeof promiseHash === "number") {
        return reject(new TypeError("PromiseHash must be an object containing at least 1 promise."));
      }

      for (var p in promiseHash) {
        ++counter;

        (function (prop) {
          self.getPromiseState(promiseHash[prop]).then(function (result) {
            results[prop] = result;
            if (--counter === 0) {
              resolve(results);
            }
          }).caught(function (err) {
            reject(err);
          });
        })(p);
      }

      if (0 === counter) {
        resolve({});
      }
    });
  };

  /**
   * set jitterFactor to > 0 to improve receiver perf in the worst case
   */
  PromiseArmor.prototype.withRetry = function (retries, promiseFn, options) {
    var DEFAULT_WAIT = 1000;
    var DEFAULT_JITTER_FACTOR = 0;
    var DEFAULT_EXPONENT_BASE = 2;

    options = options || {};
    var jitterFactor = options.jitterFactor;
    var wait = options.wait;
    var exponentBase = options.exponentBase;

    var errs = [];

    if (typeof wait === 'undefined') {
      wait = DEFAULT_WAIT;
    }
    if (typeof jitterFactor === 'undefined') {
      jitterFactor = DEFAULT_JITTER_FACTOR;
    }
    if (typeof exponentBase === 'undefined') {
      exponentBase = DEFAULT_EXPONENT_BASE;
    }

    return this.promiseFactoryFn(function (resolve, reject) {
      var loop = function () {
        promiseFn().then(resolve).caught(function (err) {
          errs.push(err);
          if (!retries) {
            return reject(errs);
          }
          retries--;
          wait *= exponentBase + getJitter(exponentBase, jitterFactor);
          setTimeout(loop, wait);
        });
      };

      loop();
    });
  };

  PromiseArmor.prototype.withRetryAndTimeout = function (retries, timeout, promiseFn, cancelFn, retryOptions) {
    var self = this;

    return this.withRetry(retries, function () {
      return self.withTimeout(timeout, promiseFn, cancelFn);
    }, retryOptions);
  };

  PromiseArmor.prototype.withTimeout = function (timeout, promiseFn, cancelFn) {
    var done = false;
    return this.promiseFactoryFn(function (resolve, reject) {
      promiseFn().then(function (result) {
        done = true;
        resolve(result);
      }).caught(function (err) {
        done = true;
        reject(err);
      });
      setTimeout(function () {
        if (done) {
          return;
        }
        cancelFn && cancelFn();
        reject("TimeOutError");
      }, timeout);
    });
  };

  PromiseArmor.prototype.wrap = PromiseArmor.prototype.method = function (maybePromiseFn) {
    var self = this;

    if (typeof maybePromiseFn !== 'function') {
      throw new TypeError("Input must be a function.");
    }

    return function () {
      var args = Array.prototype.slice.apply(arguments);
      var innerSelf = this;
      return self.promiseFactoryFn(function (resolve, reject) {
        setTimeout(function () {
          try {
            var maybePromise = maybePromiseFn.apply(innerSelf, args);
            if (maybePromise && maybePromise.then) {
              maybePromise.then(resolve, reject);
            } else {
              resolve(maybePromise);
            }
          } catch (e) {
            reject(e);
          }
        }, 1);
      });
    };
  };

  return PromiseArmor;
}));