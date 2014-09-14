# finance-stream

## Usage

```javascript

var fstream = require('finance-stream');
var _ = require('highland');

fstream
  .stockTicker(['YHOO', 'GOOG'], ['symbol', 'Ask', 'Bid'])
  .through(fstream.toFloat('Ask', 'Bid'))
  .each(_.log);

```

## License
Copyright (c) 2014 Simon Kusterer
Licensed under the MIT license.