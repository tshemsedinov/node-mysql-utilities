0.0.4 / 2013-10-26
==================

  * Added event to catch any query execution: connection.on('query', function(err, query) {});
  * Added event to catch slow query execution: connection.on('slow', function(err, executionTime, query) {});
  * Added connection parameter: connection.slowTime in milliseconds, default value is 2000

0.0.3 / 2013-10-24
==================

  * Fixed connection.queryArray calls, docs and examples

0.0.2 / 2013-10-24
==================

  * connection.queryArray renamed to connection.queryCol by analogy with connection.queryRow

0.0.1 / 2013-10-23
==================

  * Initial release (extracted from https://github.com/tshemsedinov/node-mysql and https://github.com/tshemsedinov/impress)

