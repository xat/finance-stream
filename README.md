# finance-stream

realtime stock and exchange stream.

## Usage

```javascript

var fstream = require('finance-stream');
var _ = require('highland');

// build an ongoing ticker which fetches
// yahoo and google stock data in an interval
// of 1 sec
fstream
  .stockTicker(['YHOO', 'GOOG'], ['symbol', 'Ask', 'Bid'])
  .through(fstream.toFloat('Ask', 'Bid'))
  .each(_.log);

// convert euro into baht and
// pipe the response to stdout
fstream
  .exchangeStream('EURTHB')
  .pluck('Rate')
  .pipe(process.stdout);

```

### Installation

`npm install finance-stream`

## License
Copyright (c) 2014 Simon Kusterer
Licensed under the MIT license.