"use strict";
var assert = require("assert");
var Promise = require('./utils/setup-es6-promise');

/*
 Copyright 2009–2012 Kristopher Michael Kowal. All rights reserved.
 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated documentation files (the "Software"), to
 deal in the Software without restriction, including without limitation the
 rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
 sell copies of the Software, and to permit persons to whom the Software is
 furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in
 all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
 IN THE SOFTWARE.
 */

describe("timeout", function () {
  it("should do nothing if the promise fulfills quickly", function() {
    return Promise.withTimeout(200, function () {
      return Promise.delay(1).then(function () {
      });
    });
  });

  it("should do nothing if the promise rejects quickly", function() {
    var goodError = new Error("haha!");
    return Promise.withTimeout(200, function () {
      return Promise.delay(1)
        .then(function () {
          throw goodError;
        })
        .then(undefined, function (error) {
          assert(error === goodError);
        });
    });
  });

  it("should reject with a timeout error if the promise is too slow", function() {
    return Promise.withTimeout(1, function () {
      return Promise.delay(100);
    }).then(assert.fail).caught(function () {
    });
  });

  it("should invoke the cancellation function if the promise is too slow", function() {
    return new Promise(function (resolve, reject) {
      return Promise.withTimeout(1, function () {
        return Promise.delay(100);
      }, function () {
        resolve("Cancellation invoked.");
      }).then(assert.fail);
    });
  });

  it("should not invoke the cancellation function if the promise is adequately fast", function() {
    return new Promise(function (resolve, reject) {
      setTimeout(resolve, 100);

      return Promise.withTimeout(50, function () {
        return Promise.delay(1);
      }, assert.fail).then(assert.fail);
    });
  });

  // NOT supporting this functionality for now.
  //it("should reject with a custom timeout error if the promise is too slow and msg was provided", function() {
  //  return Promise.delay(1)
  //    .caught(function(e){
  //      assert(/custom/i.test(e.message));
  //    });
  //});
});

describe("delay", function () {
  return; // Not supporting instance-level #delay method.

  it("should not delay rejection", function() {
    var promise = Promise.reject(5).delay(1);

    promise.then(assert.fail, function(){});

    return Promise.delay(1).then(function () {
      assert(!promise.isPending());
    });
  });

  it("should delay after resolution", function () {
    var promise1 = Promise.delay("what", 1);
    var promise2 = promise1.delay(1);

    return promise2.then(function (value) {
      assert(value === "what");
    });
  });

  it("should pass through progress notifications from passed promises", function() {
    var deferred = Promise.defer();

    var progressValsSeen = [];
    var promise = Promise.delay(deferred.promise, 1).then(function () {
      assert.deepEqual(progressValsSeen, [1, 2, 3]);
    }, undefined, function (progressVal) {
      progressValsSeen.push(progressVal);
    });

    Promise.delay(1)
      .then(function () { deferred.progress(1); })
      .delay(1)
      .then(function () { deferred.progress(2); })
      .delay(1)
      .then(function () { deferred.progress(3); })
      .delay(1)
      .then(function () { deferred.resolve(); });
    return promise;
  });

  it("should resolve follower promise's value", function() {
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
    return Promise.delay(f, 1).then(function(value) {
      assert.equal(value, 3);
    });
  });
});