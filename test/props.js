"use strict";

var assert = require("assert");

var $Promise = require('./utils/jquery.promise');
var PromiseArmor = require('../lib/promise-armor');
var Promises = [];

Promises.push(require('./utils/setup-es6-promise'));
Promises.push(PromiseArmor.extendPromise($Promise, true));

/*
 Based on When.js tests
 Open Source Initiative OSI - The MIT License
 http://www.opensource.org/licenses/mit-license.php
 Copyright (c) 2011 Brian Cavalier
 Permission is hereby granted, free of charge, to any person obtaining
 a copy of this software and associated documentation files (the
 "Software"), to deal in the Software without restriction, including
 without limitation the rights to use, copy, modify, merge, publish,
 distribute, sublicense, and/or sell copies of the Software, and to
 permit persons to whom the Software is furnished to do so, subject to
 the following conditions:
 The above copyright notice and this permission notice shall be
 included in all copies or substantial portions of the Software.
 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
 MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
 LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
 OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
 WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.*/

Promises.forEach(function(Promise, idx) {
  describe("Promise.props: " + idx, function () {

    specify("should reject undefined", function () {
      Promise.props().caught(function (err) {
        assert(err instanceof TypeError);
      })
    });

    specify("should reject primitive", function () {
      Promise.props("str").caught(function (err) {
        assert(err instanceof TypeError);
      });
    });

    specify("should resolve to new object", function () {
      var o = {};
      return Promise.props(o).then(function (v) {
        assert(v !== o);
        assert.deepEqual(o, v);
      });
    });

    specify("should resolve value properties", function () {
      var o = {
        one: 1,
        two: 2,
        three: 3
      };
      return Promise.props(o).then(function (v) {
        assert.deepEqual({
          one: 1,
          two: 2,
          three: 3
        }, v);
      });
    });

    specify("should resolve immediate properties", function () {
      var o = {
        one: Promise.resolve(1),
        two: Promise.resolve(2),
        three: Promise.resolve(3)
      };
      return Promise.props(o).then(function (v) {
        assert.deepEqual({
          one: 1,
          two: 2,
          three: 3
        }, v);
      });
    });

    specify("should resolve eventual properties", function () {
      var d1 =  new Promise(function (resolve) {
        setTimeout(function() {
          resolve(1);
        },1)
      });
      var d2 =  new Promise(function (resolve) {
        setTimeout(function() {
          resolve(2);
        },1)
      });
      var d3 =  new Promise(function (resolve) {
        setTimeout(function() {
          resolve(3);
        },1)
      });

      var o = {
        one: d1,
        two: d2,
        three: d3
      };

      return Promise.props(o).then(function (v) {
        assert.deepEqual({
          one: 1,
          two: 2,
          three: 3
        }, v);


      });

      specify("should reject if any input promise rejects", function () {
        var o = {
          one: Promise.resolve(1),
          two: Promise.reject(2),
          three: Promise.resolve(3)
        };
        return Promise.props(o).then(assert.fail, function (v) {
          assert(v === 2);
        });
      });

      specify("should accept a promise for an object", function () {
        var o = {
          one: Promise.resolve(1),
          two: Promise.resolve(2),
          three: Promise.resolve(3)
        };
        var d1 = Promise.defer();
        setTimeout(function () {
          d1.fulfill(o);
        }, 1);
        return Promise.props(d1.promise).then(function (v) {
          assert.deepEqual({
            one: 1,
            two: 2,
            three: 3
          }, v);
        });

      });

      specify("should reject a promise for a primitive", function () {
        var d1 = Promise.defer();
        setTimeout(function () {
          d1.fulfill("text");
        }, 1);
        return Promise.props(d1.promise).caught(TypeError, function () {
        });

      });

      specify("should accept thenables in properties", function () {
        var t1 = {
          then: function (cb) {
            cb(1);
          }
        };
        var t2 = {
          then: function (cb) {
            cb(2);
          }
        };
        var t3 = {
          then: function (cb) {
            cb(3);
          }
        };
        var o = {
          one: t1,
          two: t2,
          three: t3
        };
        return Promise.props(o).then(function (v) {
          assert.deepEqual({
            one: 1,
            two: 2,
            three: 3
          }, v);
        });
      });

      specify("should accept a thenable for thenables in properties", function () {
        var o = {
          then: function (f) {
            f({
              one: {
                then: function (cb) {
                  cb(1);
                }
              },
              two: {
                then: function (cb) {
                  cb(2);
                }
              },
              three: {
                then: function (cb) {
                  cb(3);
                }
              }
            });
          }
        };
        return Promise.props(o).then(function (v) {
          assert.deepEqual({
            one: 1,
            two: 2,
            three: 3
          }, v);
        });
      });

      specify("sends { key, value } progress updates", function () {
        var deferred1 = Promise.defer();
        var deferred2 = Promise.defer();

        var progressValues = [];

        Promise.delay(1).then(function () {
          deferred1.progress("a");
        }).delay(1).then(function () {
          deferred2.progress("b");
          deferred2.resolve();
        }).delay(1).then(function () {
          deferred1.progress("c");
          deferred1.resolve();
        });

        return Promise.props({
          one: deferred1.promise,
          two: deferred2.promise
        }).then(function () {
            assert.deepEqual(progressValues, [
              {key: "one", value: "a"},
              {key: "two", value: "b"},
              {key: "one", value: "c"}
            ]);
          },
          undefined,
          function (progressValue) {
            progressValues.push(progressValue);
          });
      });

      specify("treats arrays for their properties", function () {
        var o = [1, 2, 3];

        return Promise.props(o).then(function (v) {
          assert.deepEqual({
            0: 1,
            1: 2,
            2: 3
          }, v);
        });
      });

    });
  });
});
