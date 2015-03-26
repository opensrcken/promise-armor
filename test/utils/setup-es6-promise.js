var ES6Promise = require('es6-promise').Promise;
var PromiseArmor = require('../../lib/promise-armor');

var implementInterfaceOnEs6Promise = function (Promise) {
  Promise.prototype.isPending = function () {
    return this._state === void 0;
  };

  Promise.prototype.isFulfilled = function () {
    return this._state === 1;
  };

  Promise.prototype.isRejected = function () {
    return this._state === 2;
  };

  Promise.prototype.getResolution = function () {
    return this._result;
  };
};

implementInterfaceOnEs6Promise(ES6Promise);
module.exports = PromiseArmor.extendPromise(ES6Promise, true);