"use strict";
var assert = require("assert");
var Promise = require('./utils/setup-es6-promise');

describe("retry", function () {
  it("should work for 0 retries", function () {
    return Promise.withRetries(0, function () {
      return Promise.reject(1);
    }).then(assert.fail).caught(function (errs) {
      assert.equal(errs.length, 1);
      assert.equal(errs[0], 1);
    });
  });

  it("should work for 1 retries", function () {
    var counter = 0;

    return Promise.withRetries(1, function () {
      return Promise.reject(counter++);
    }, {
      exponentBase: 0
    }).then(assert.fail).caught(function (errs) {
      assert.equal(errs.length, 2);
      assert.equal(errs[0], 0);
      assert.equal(errs[1], 1);
    });
  });

  it("should succeed after N-1 failures", function () {
    var counter = 0;
    var N = 5;

    return Promise.withRetries(N, function () {
      if (counter++ === N) {
        return Promise.resolve(N);
      } else {
        return Promise.reject(counter);
      }
    }, {
      exponentBase: 0
    }).then(function (result) {
      assert.equal(result, N);
    }).caught(assert.fail);
  });
});