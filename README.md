![impress logo](http://habrastorage.org/storage3/747/830/b17/747830b1782bd95f28b8d05eff8e05d9.jpg)

[Utilities](https://github.com/tshemsedinov/node-mysql-utilities) [node-mysql driver](https://github.com/felixge/node-mysql) with specialized result types, introspection and other helpful functionality. for [node.js](http://nodejs.org). All decisions are made. Ready for applied development.

## Installation

```bash
$ npm install mysql-utilities
```

## Features

  - MySQL Data Access Methods
    - Query selecting single row: connection.queryRow(sql, values, callback)
    - Query selecting scalar (single value): connection.queryValue(sql, values, callback)
    - Query selecting column into array: connection.queryCol(sql, values, callback)
    - Query selecting hash of records: connection.queryHash(sql, values, callback)
    - Query selecting key/value hash: connection.queryKeyValue(sql, values, callback)
  - MySQL Introspection Methods
    - Get primary key metadata: connection.primary(table, callback)
    - Get foreign key metadata: connection.foreign(table, callback)
    - Get table constraints metadata: connection.constraints(table, callback)
    - Get table fields metadata: connection.fields(table, callback)
    - Get connection databases array: connection.databases(callback)
    - Get database tables list for current db: connection.tables(callback)
    - Get database tables list for given db: connection.databaseTables(database, callback)
    - Get table metadata: connection.tableInfo(table, callback)
    - Get table indexes metadata: connection.indexes(table, callback)
    - Get server process list: connection.processes(callback)
    - Get server global variables: connection.globalVariables(callback)
    - Get server global status: connection.globalStatus(callback)
    - Get database users: connection.users(callback)
  - MySQL SQL Autogenerating Methods
    - Selecting record(s): connection.select(table, whereFilter, callback)
    - Inserting record: connection.insert(table, row, callback)
    - Updating record: connection.update(table, row, callback)
    - Inserting or selecting record: connection.upsert(table, row, callback)
    - Count records with filter: connection.count(table, whereFilter, callback)
    - Delete record(s): connection.delete(table, whereFilter, callback)
  - Events
    - Catch any query execution: connection.on('query', function(err, res, fields, query) {});
    - Catch slow query execution: connection.on('slow', function(err, res, fields, query, executionTime) {});

## Initialization

  Utilities can be attached to connection using mix-ins:

```js
// Library dependencies
var mysql = require('mysql'),
	mysqlUtilities = require('utilities');

var connection = mysql.createConnection({
	host:     'localhost',
	user:     'userName',
	password: 'secret',
	database: 'databaseName'
});

connection.connect();

// Mix-in for Data Access Methods and SQL Autogenerating Methods
mysqlUtilities.upgrade(connection);

// Mix-in for Introspection Methods
mysqlUtilities.introspection(connection);

// Do something using utilities
connection.queryRow(
	'SELECT * FROM _Language where LanguageId=?', [3],
	function(err, row) {
		console.dir({queryRow:row});
	}
);

// Release connection
connection.end();
```

## Contributors

  - Timur Shemsedinov (marcusaurelius)

## License 

Dual licensed under the MIT or RUMI licenses.

Copyright (c) 2012-2013 MetaSystems &lt;timur.shemsedinov@gmail.com&gt;

License: RUMI

Do you know what you are?
You are a manuscript of a divine letter.
You are a mirror reflecting a noble face.
This universe is not outside of you.
Look inside yourself;
everything that you want,
you are already that.

Jalal ad-Din Muhammad Rumi
"Hush, Don't Say Anything to God: Passionate Poems of Rumi"