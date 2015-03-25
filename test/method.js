"use strict";

var assert = require("assert");

var ES6Promise = require('es6-promise').Promise;
var $Promise = require('./utils/jquery.promise');
var PromiseArmor = require('../lib/promise-armor');
var Promises = [];

var implementInterfaceOnEs6Promise = function (Promise) {
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
Promises.push(PromiseArmor.extendPromise(ES6Promise, true));
Promises.push(PromiseArmor.extendPromise($Promise, true));

Promises.forEach(function (Promise, idx) {
  var obj = {foo: 'bar'};
  var error = new Error();
  var thrower = Promise.method(function() {
    throw error;
  });

  var identity = Promise.method(function(val) {
    return val;
  });

  var array = Promise.method(function() {
    return [].slice.call(arguments);
  });

  var receiver = Promise.method(function() {
    return this;
  });

  describe("Promise.method: " + idx, function(){
    specify("should reject when the function throws", function() {
      var async = false;
      var p = new Promise(function (res, rej) {
        thrower().then(function (arg) {
          assert.fail();
          res();
        }, function(e) {
          assert(async);
          assert(e === error);
          res();
        });
      });
      async = true;
      return p;
    });
    specify("should throw when the function is not a function", function() {
      try {
        Promise.method(null);
      }
      catch (e) {
        assert(e instanceof TypeError);
        return;
      }
      assert.fail();
    });
    specify("should call the function with the given receiver", function(){
      var async = false;
      var ret = receiver.call(obj).then(function(val) {
        assert(async);
        assert(val === obj);
      }, assert.fail);
      async = true;
      return ret;
    });
    specify("should call the function with the given value", function(){
      var async = false;
      var ret = identity(obj).then(function(val) {
        assert(async);
        assert(val === obj);
      }, assert.fail);
      async = true;
      return ret;
    });
    specify("should apply the function if given value is array", function(){
      var async = false;
      var ret = array(1, 2, 3).then(function(val) {
        assert(async);
        assert.deepEqual(val, [1,2,3]);
      }, assert.fail);
      async = true;
      return ret;
    });

    specify("should unwrap returned promise", function(){
      var ret = Promise.method(function(){
        return new Promise(function (res) {
          setTimeout(function () {
            res(3);
          }, 1)
        });
      })().then(function(v){
        assert(v === 3);
      })
      return ret;
    });
    specify("should unwrap returned thenable", function(){

      return Promise.method(function(){
        return {
          then: function(f, v) {
            f(3);
          }
        }
      })().then(function(v){
        assert(v === 3);
      });
    });

    specify("should unwrap a following promise", function() {
      var resolveF;
      var f = new Promise(function() {
        resolveF = arguments[0];
      });
      var v = new Promise(function(f) {
        setTimeout(function() {
          f(3);
        }, 1);
      });
      resolveF(v);
      return Promise.method(function(){
        return f;
      })().then(function(v){
        assert(v === 3);
      });
    });

    specify("zero arguments length should remain zero", function() {
      return Promise.method(function(){
        assert(arguments.length === 0);
      })();
    });
  });
});
