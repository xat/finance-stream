var got = require('got');
var _ = require('highland');
var queryExtend = require('query-extend');
var objectPath = require('object-path');
var format = require('util').format;

var YQL_API = 'http://query.yahooapis.com/v1/public/yql';

var getGot = _.wrapCallback(got);

var slice = Array.prototype.slice;

var isString = function(val) {
  return typeof val === 'string';
};

var arrayElement = function(val) {
  return _.isArray(val) ? val : [val];
};

// check if target contains all
// properties and values of source
var has = function(source, target) {
  for (var k in source) {
    if (!source.hasOwnProperty(k)) continue;
    if (source[k] !== target[k]) return false;
  }
  return true;
};

var factory = function(fn) {
  var args = slice.call(arguments, 1);
  return function() {
    return fn.apply(null, args);
  };
};

var jsonParser = function(s) {
  return s.map(function(data) {
    return JSON.parse(data);
  });
};

var toFloat = function() {
  var args = slice.call(arguments);
  return function(s) {
    return s.map(function(data) {
      if (data)
        args.forEach(function(k) {
          data[k] = parseFloat(data[k]);
        });
      return data;
    });
  };
};

// only pass values to the downstream if
// there where changes in certain fields
var discardUnchanged = function(key) {
  var args = slice.call(arguments, 1);
  var memo = {};
  return function(s) {
    return s.filter(function(data) {
      var cache = [];
      args.forEach(function(val) {
        cache.push(data[val]);
      });
      cache = cache.join('::');
      if (memo[key] !== cache) {
        memo[key] = cache;
        return true;
      }
    });
  };
};

// extract values from a json-path
// and pass them into the downstream
var fromPath = function(path) {
  return function(s) {
    return s.map(function(data) {
      return objectPath.get(data, path);
    });
  };
};

// fire a yql query through got,
// parse the response as json and
// return the stream
var yql = function(query) {
  var args = slice.call(arguments);
  return getGot(queryExtend(YQL_API, {
    q: format.apply(null, args),
    format: 'json',
    env: 'store://datatables.org/alltableswithkeys'
  }))
    .through(jsonParser);
};

// check if the current data fulfills 'where'.
// if so, duplicate the data and merge the further
// arguments
var splitMerge = function(where) {
  var args = slice.call(arguments, 1);
  return function(s) {
    return s.consume(function(err, data, push, next) {
      if (err) {
        push(err);
        next();
        return;
      }
      // push the original data
      push(null, data);
      if (data === _.nil || !has(where, data)) {
        next();
        return;
      }
      args.forEach(function(obj) {
        push(null, _.extend(obj, data));
      });
      next();
    });
  };
};

// create a new stream in a certain interval
// and merge that new stream into an ongoing
// stream
var ticker = function(fn, ms) {
  if (!ms) ms = 1000;
  return _(function(push, next) {
    setTimeout(function() {
      push(null, fn());
      next();
    }, ms);
  }).sequence();
};

// create a new stock stream
var stockStream = function(symbols, fields) {
  if (!fields) fields = '*';
  fields = arrayElement(fields);
  symbols = arrayElement(symbols);
  return yql('SELECT %s FROM yahoo.finance.quotes WHERE symbol IN ("%s")',
    fields.join(','),
    symbols.join('","'))
    .through(fromPath('query.results.quote'))
    .flatten();
};

// create a new exchange stream
var exchangeStream = function(fromto, fields) {
  if (!fields) fields = '*';
  fields = arrayElement(fields);
  fromto = arrayElement(fromto);
  return yql('SELECT %s FROM yahoo.finance.xchange WHERE pair in ("%s")',
    fields.join(','),
    fromto.join('","'))
    .through(fromPath('query.results.rate'))
    .flatten();
};

// create a stock ticker stream
var stockTicker = function(symbols, fields, ms) {
  return ticker(factory(stockStream, symbols, fields), ms);
};

// create a exchange ticker stream
var exchangeTicker = function(fromto, fields, ms) {
  return ticker(factory(exchangeStream, fromto, fields), ms);
};

module.exports = {

  yql: yql,
  stockStream: stockStream,
  stockTicker: stockTicker,
  exchangeStream: exchangeStream,
  exchangeTicker: exchangeTicker,
  toFloat: toFloat,
  splitMerge: splitMerge,
  discardUnchanged: discardUnchanged,
  jsonParser: jsonParser

};
