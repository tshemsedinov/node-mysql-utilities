1.0.6 / 2014-10-18
==================

  * Added non-numeric sets support, e.g. connection.select('users', '*', { email: '(test@mail.ru,test3@mail.ru)' });
  * Implemented order parameter, e.g. connection.select('users', 'id,email', {'name':'test'}, {date: 'asc'}, function() {});

1.0.5 / 2014-05-26
==================

  * Added "use strict";
  * Some code refactored and variable declaration fixed

1.0.4 / 2014-02-08
==================

  * Added support for streaming query rows, see https://github.com/felixge/node-mysql#streaming-query-rows

1.0.3 / 2013-12-12
==================

  * Improved connection.update(table, row, where, callback), "where" is optional parameter, see examples

1.0.2 / 2013-11-26
==================

  * Parameter "value" turned into optional in query, queryRow, queryValue, queryCol, queryHash, queryKeyValue

1.0.1 / 2013-11-15
==================

  * Emit 'error' event into connection
  * Added documentation into Readme

0.0.4 / 2013-10-26
==================

  * Added event to catch any query execution: connection.on('query', function(err, res, fields, query) {});
  * Added event to catch slow query execution: connection.on('slow', function(err, res, fields, query, executionTime) {});
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

