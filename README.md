# Node MySql Utilities

[Utilities](https://github.com/tshemsedinov/node-mysql-utilities) for
[node-mysql driver](https://github.com/felixge/node-mysql) with specialized
result types, introspection and other helpful functionality for
[node.js](http://nodejs.org). Initially this utilities were part of
[Impress](https://npmjs.org/package/impress) Application Server and
extracted separately for use with other frameworks.

[![TravisCI](https://travis-ci.org/tshemsedinov/node-mysql-utilities.svg?branch=master)](https://travis-ci.org/tshemsedinov/node-mysql-utilities)
[![Codacy Badge](https://api.codacy.com/project/badge/Grade/23e7143d77a0484983cdff30072a5aca)](https://www.codacy.com/app/metarhia/node-mysql-utilities)
[![NPM Version](https://badge.fury.io/js/mysql-utilities.svg)](https://badge.fury.io/js/mysql-utilities)
[![NPM Downloads/Month](https://img.shields.io/npm/dm/mysql-utilities.svg)](https://www.npmjs.com/package/mysql-utilities)
[![NPM Downloads](https://img.shields.io/npm/dt/mysql-utilities.svg)](https://www.npmjs.com/package/mysql-utilities)

![impress logo](http://habrastorage.org/storage3/747/830/b17/747830b1782bd95f28b8d05eff8e05d9.jpg)

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
- MySQL SQL Statements Autogenerating Methods
  - Selecting record(s): connection.select(table, whereFilter, callback)
  - Inserting record: connection.insert(table, row, callback)
  - Updating record: connection.update(table, row, where, callback)
  - Inserting or selecting record: connection.upsert(table, row, callback)
  - Count records with filter: connection.count(table, whereFilter, callback)
  - Delete record(s): connection.delete(table, whereFilter, callback)
- Events
  - Catch any query execution: connection.on('query', function(err, res, fields, query) {});
  - Catch errors: connection.on('error', function(err, query) {});
  - Catch slow query execution: connection.on('slow', function(err, res, fields, query, executionTime) {});

## Initialization

Utilities can be attached to connection using mix-ins:

```js
// Library dependencies
const mysql = require('mysql');
const mysqlUtilities = require('mysql-utilities');

const connection = mysql.createConnection({
  host: 'localhost',
  user: 'userName',
  password: 'secret',
  database: 'databaseName',
});

connection.connect();

// Mix-in for Data Access Methods and SQL Autogenerating Methods
mysqlUtilities.upgrade(connection);

// Mix-in for Introspection Methods
mysqlUtilities.introspection(connection);

// Do something using utilities
connection.queryRow(
  'SELECT * FROM _Language where LanguageId=?',
  [3],
  (err, row) => {
    console.dir({ queryRow: row });
  }
);

// Release connection
connection.end();
```

## Examples

Single row selection: connection.queryRow(sql, values, callback) returns hash as callback second parameter, field names becomes hash keys.

```js
connection.queryRow(
  'SELECT * FROM Language where LanguageId=?',
  [3],
  (err, row) => {
    console.dir({ queryRow: row });
  }
);
```

Output:

```js
queryRow: {
  LanguageId: 3,
  LanguageName: 'Russian',
  LanguageSign: 'ru',
  LanguageISO: 'ru',
  Caption: 'Русский'
}
```

Single value selection: connection.queryValue(sql, values, callback) returns single value as callback second parameter (instead of array in array). For example, for Id selection by name with LIMIT 1 or count(\*), max(field) etc.

```js
connection.queryValue(
  'SELECT LanguageName FROM Language where LanguageId=?',
  [8],
  (err, name) => {
    console.dir({ queryValue: name });
  }
);
```

Output:

```js
{
  queryValue: 'Italiano';
}
```

Single column selection: connection.queryCol(sql, values, callback) returns array as callback second parameter.

```js
connection.queryCol('SELECT LanguageSign FROM Language', [], (err, result) => {
  console.dir({ queryCal: result });
});
```

Output:

```js
queryArray: ['de', 'en', 'es', 'fr', 'it', 'pl', 'ru', 'ua'];
```

Hash selection: connection.queryHash(sql, values, callback) returns hash as callback second parameter, hash keyed by first field values from SQL statement.

```js
connection.queryHash(
  'SELECT LanguageSign, LanguageId, LanguageName, Caption, LanguageISO FROM Language',
  [],
  (err, result) => {
    console.dir({ queryHash: result });
  }
);
```

Output:

```js
queryHash: {
  en: {
    LanguageSign: 'en',
    LanguageId: 2,
    LanguageName: 'English',
    Caption: 'Английский',
    LanguageISO: 'en' },
  ru: {
    LanguageSign: 'ru',
    LanguageId: 3,
    LanguageName: 'Russian',
    Caption: 'Русский',
    LanguageISO: 'ru' },
  de: {
    LanguageSign: 'de',
    LanguageId: 7,
    LanguageName: 'Deutsch',
    Caption: 'Немецкий',
    LanguageISO: 'de' },
  it: {
    LanguageSign: 'it',
    LanguageId: 8,
    LanguageName: 'Italiano',
    Caption: 'Итальянский',
    LanguageISO: 'it'
  }
}
```

Key/value pair selection: connection.queryKeyValue(sql, values, callback) returns hash as callback second parameter, hash keyed by first field, values filled by second field.

```js
connection.queryKeyValue(
  'SELECT LanguageISO, LanguageName FROM Language',
  [],
  (err, keyValue) => {
    console.dir({ queryKeyValue: keyValue });
  }
);
```

Output:

```js
keyValue: {
  en: 'English',
  ru: 'Russian',
  uk: 'Ukrainian',
  es: 'Espanol',
  fr: 'Francais',
  de: 'Deutsch',
  it: 'Italiano',
  pl: 'Poliski'
}
```

Get primary key list with metadata: connection.primary(table, callback) returns metadata as callback second parameter.

```js
connection.primary('Language', (err, primary) => {
  console.dir({ primary });
});
```

Output:

```js
primary: {
  Table: 'language',
  Non_unique: 0,
  Key_name: 'PRIMARY',
  Seq_in_index: 1,
  Column_name: 'LanguageId',
  Collation: 'A',
  Cardinality: 9,
  Sub_part: null,
  Packed: null,
  Null: '',
  Index_type: 'BTREE',
  Comment: '',
  Index_comment: ''
}
```

Get foreign key list with metadata: connection.foreign(table, callback) returns metadata as callback second parameter.

```js
connection.foreign('TemplateCaption', (err, foreign) => {
  console.dir({ foreign });
});
```

Output:

```js
foreign: {
  fkTemplateCaptionLanguage: {
    CONSTRAINT_NAME: 'fkTemplateCaptionLanguage',
    COLUMN_NAME: 'LanguageId',
    ORDINAL_POSITION: 1,
    POSITION_IN_UNIQUE_CONSTRAINT: 1,
    REFERENCED_TABLE_NAME: 'language',
    REFERENCED_COLUMN_NAME: 'LanguageId' },
  fkTemplateCaptionTemplate: {
    CONSTRAINT_NAME: 'fkTemplateCaptionTemplate',
    COLUMN_NAME: 'TemplateId',
    ORDINAL_POSITION: 1,
    POSITION_IN_UNIQUE_CONSTRAINT: 1,
    REFERENCED_TABLE_NAME: 'template',
    REFERENCED_COLUMN_NAME: 'TemplateId'
  }
}
```

Referential constraints list with metadata: connection.constraints(table, callback).

```js
connection.constraints('TemplateCaption', (err, constraints) => {
  console.dir({ constraints });
});
```

Output:

```js
constraints: {
  fkTemplateCaptionLanguage: {
    CONSTRAINT_NAME: 'fkTemplateCaptionLanguage',
    UNIQUE_CONSTRAINT_NAME: 'PRIMARY',
    REFERENCED_TABLE_NAME: 'Language',
    MATCH_OPTION: 'NONE',
    UPDATE_RULE: 'RESTRICT',
    DELETE_RULE: 'CASCADE' },
  fkTemplateCaptionTemplate: {
    CONSTRAINT_NAME: 'fkTemplateCaptionTemplate',
    UNIQUE_CONSTRAINT_NAME: 'PRIMARY',
    REFERENCED_TABLE_NAME: 'Template',
    MATCH_OPTION: 'NONE',
    UPDATE_RULE: 'RESTRICT',
    DELETE_RULE: 'CASCADE'
  }
}
```

Get table fields with metadata: connection.fields(table, callback).

```js
connection.fields('Language', (err, fields) => {
  console.dir({ fields });
});
```

Output:

```js
fields: {
  LanguageId: {
    Field: 'LanguageId',
    Type: 'int(10) unsigned',
    Collation: null,
    Null: 'NO',
    Key: 'PRI',
    Default: null,
    Extra: 'auto_increment',
    Privileges: 'select,insert,update,references',
    Comment: 'Id(EN),Код(RU)' },
  LanguageName: {
    Field: 'LanguageName',
    Type: 'varchar(32)',
    Collation: 'utf8_general_ci',
    Null: 'NO',
    Key: 'UNI',
    Default: null,
    Extra: '',
    Privileges: 'select,insert,update,references',
    Comment: 'Name(EN),Имя(RU)'
  }, ...
}
```

Get database list for current connection: connection.databases(callback).

```js
connection.databases((err, databases) => {
  console.dir({ databases });
});
```

Output:

```js
databases: [
  'information_schema',
  'mezha',
  'mysql',
  'performance_schema',
  'test',
];
```

Get table list for current database: connection.tables(callback).

```js
connection.tables((err, tables) => {
  console.dir({ tables });
});
```

Output:

```js
tables: {
  Language: {
    TABLE_NAME: 'Language',
    TABLE_TYPE: 'BASE TABLE',
    ENGINE: 'InnoDB',
    VERSION: 10,
    ROW_FORMAT: 'Compact',
    TABLE_ROWS: 9,
    AVG_ROW_LENGTH: 1820,
    DATA_LENGTH: 16384,
    MAX_DATA_LENGTH: 0,
    INDEX_LENGTH: 49152,
    DATA_FREE: 8388608,
    AUTO_INCREMENT: 10,
    CREATE_TIME: Mon Jul 15 2013 03:06:08 GMT+0300 (Финляндия (лето)),
    UPDATE_TIME: null,
    CHECK_TIME: null,
    TABLE_COLLATION: 'utf8_general_ci',
    CHECKSUM: null,
    CREATE_OPTIONS: '',
    TABLE_COMMENT: '_Language:Languages(EN),Языки(RU)'
  }, ...
}
```

Get table list for specified database: connection.databaseTables(database, callback).

```js
connection.databaseTables('databaseName', (err, tables) => {
  console.dir({ databaseTables: tables });
});
```

Output:

```js
tables: {
  Language: {
    TABLE_NAME: 'Language',
    TABLE_TYPE: 'BASE TABLE',
    ENGINE: 'InnoDB',
    VERSION: 10,
    ROW_FORMAT: 'Compact',
    TABLE_ROWS: 9,
    AVG_ROW_LENGTH: 1820,
    DATA_LENGTH: 16384,
    MAX_DATA_LENGTH: 0,
    INDEX_LENGTH: 49152,
    DATA_FREE: 8388608,
    AUTO_INCREMENT: 10,
    CREATE_TIME: Mon Jul 15 2013 03:06:08 GMT+0300 (Финляндия (лето)),
    UPDATE_TIME: null,
    CHECK_TIME: null,
    TABLE_COLLATION: 'utf8_general_ci',
    CHECKSUM: null,
    CREATE_OPTIONS: '',
    TABLE_COMMENT: '_Language:Languages(EN),Языки(RU)'
  }, ...
}
```

Get table metadata: connection.tableInfo(table, callback).

```js
connection.tableInfo('Language', (err, info) => {
  console.dir({ tableInfo: info });
});
```

Output:

```js
tableInfo: {
  Name: 'language',
  Engine: 'InnoDB',
  Version: 10,
  Row_format: 'Compact',
  Rows: 9,
  Avg_row_length: 1820,
  Data_length: 16384,
  Max_data_length: 0,
  Index_length: 49152,
  Data_free: 9437184,
  Auto_increment: 10,
  Create_time: Mon Jul 15 2013 03:06:08 GMT+0300 (Финляндия (лето)),
  Update_time: null,
  Check_time: null,
  Collation: 'utf8_general_ci',
  Checksum: null,
  Create_options: '',
  Comment: ''
}
```

Get table indexes metadata: connection.indexes(table, callback).

```js
connection.indexes('Language', function (err, info) {
  console.dir({ tableInfo: info });
});
```

Output:

```js
indexes: {
  PRIMARY: {
    Table: 'language',
    Non_unique: 0,
    Key_name: 'PRIMARY',
    Seq_in_index: 1,
    Column_name: 'LanguageId',
    Collation: 'A',
    Cardinality: 9,
    Sub_part: null,
    Packed: null,
    Null: '',
    Index_type: 'BTREE',
    Comment: '',
    Index_comment: '' },
  akLanguage: {
    Table: 'language',
    Non_unique: 0,
    Key_name: 'akLanguage',
    Seq_in_index: 1,
    Column_name: 'LanguageName',
    Collation: 'A',
    Cardinality: 9,
    Sub_part: null,
    Packed: null,
    Null: '',
    Index_type: 'BTREE',
    Comment: '',
    Index_comment: ''
  }
}
```

Get MySQL process list: connection.processes(callback).

```js
connection.processes(function (err, processes) {
  console.dir({ processes });
});
```

Output:

```js
processes: [
  {
    ID: 62,
    USER: 'mezha',
    HOST: 'localhost:14188',
    DB: 'mezha',
    COMMAND: 'Query',
    TIME: 0,
    STATE: 'executing',
    INFO: 'SELECT * FROM information_schema.PROCESSLIST',
  },
  {
    ID: 33,
    USER: 'root',
    HOST: 'localhost:39589',
    DB: null,
    COMMAND: 'Sleep',
    TIME: 1,
    STATE: '',
    INFO: null,
  },
];
```

Get MySQL global variables: connection.globalVariables(callback)

```js
connection.globalVariables((err, globalVariables) => {
  console.dir({ globalVariables });
});
```

Output:

```js
globalVariables: {
  MAX_PREPARED_STMT_COUNT: '16382',
  MAX_JOIN_SIZE: '18446744073709551615',
  HAVE_CRYPT: 'NO',
  PERFORMANCE_SCHEMA_EVENTS_WAITS_HISTORY_LONG_SIZE: '10000',
  INNODB_VERSION: '5.5.32',
  FLUSH_TIME: '1800',
  MAX_ERROR_COUNT: '64',
  ...
}
```

Get MySQL global status: connection.globalStatus(callback)

```js
connection.globalStatus((err, globalStatus) => {
  console.dir({ globalStatus });
});
```

Output:

```js
globalStatus: {
  ABORTED_CLIENTS: '54',
  ABORTED_CONNECTS: '2',
  BINLOG_CACHE_DISK_USE: '0',
  BINLOG_CACHE_USE: '0',
  BINLOG_STMT_CACHE_DISK_USE: '0',
  BINLOG_STMT_CACHE_USE: '0',
  BYTES_RECEIVED: '654871',
  BYTES_SENT: '212454927',
  COM_ADMIN_COMMANDS: '594',
  ...
}
```

Get MySQL user list: connection.users(callback)

```js
connection.users((err, users) => {
  console.dir({ users });
});
```

Output:

```js
users: [
  {
    Host: 'localhost',
    User: 'root',
    Password: '*90E462C37378CED12064BB3388827D2BA3A9B689',
    Select_priv: 'Y',
    Insert_priv: 'Y',
    Update_priv: 'Y',
    Delete_priv: 'Y',
    Create_priv: 'Y',
    Drop_priv: 'Y',
    Reload_priv: 'Y',
    Shutdown_priv: 'Y',
    Process_priv: 'Y',
    File_priv: 'Y',
    Grant_priv: 'Y',
    References_priv: 'Y',
    Index_priv: 'Y',
    Alter_priv: 'Y',
    Show_db_priv: 'Y',
    Super_priv: 'Y',
    Create_tmp_table_priv: 'Y',
    Lock_tables_priv: 'Y',
    Execute_priv: 'Y',
    Repl_slave_priv: 'Y',
    Repl_client_priv: 'Y',
    Create_view_priv: 'Y',
    Show_view_priv: 'Y',
    Create_routine_priv: 'Y',
    Alter_routine_priv: 'Y',
    Create_user_priv: 'Y',
    Event_priv: 'Y',
    Trigger_priv: 'Y',
    Create_tablespace_priv: 'Y',
    ssl_type: '',
    ssl_cipher: <Buffer >,
    x509_issuer: <Buffer >,
    x509_subject: <Buffer >,
    max_questions: 0,
    max_updates: 0,
    max_connections: 0,
    max_user_connections: 0,
    plugin: '',
    authentication_string: ''
  }, ...
]
```

Generate MySQL WHERE statement: connection.where(conditions), works synchronously, no callback. Returns WHERE statement for given JSON-style conditions.

```js
const where = connection.where({
  id: 5,
  year: '>2010',
  price: '100..200',
  level: '<=3',
  sn: '*str?',
  label: 'str',
  code: '(1,2,4,10,11)',
});
console.dir(where);
// Output: "id = 5 AND year > '2010' AND (price BETWEEN '100' AND '200') AND
// level <= '3' AND sn LIKE '%str_' AND label = 'str' AND code IN (1,2,4,10,11)"
```

Generate SELECT statement: connection.select(table, whereFilter, orderBy, callback)

```js
connection.select(
  'Language',
  '*',
  { LanguageId: '1..3' },
  { LanguageId: 'desc' },
  (err, results) => {
    console.dir({ select: results });
  }
);
```

Generate INSERT statement: connection.insert(table, row, callback)

```js
connection.insert(
  'Language',
  {
    LanguageName: 'Tatar',
    LanguageSign: 'TT',
    LanguageISO: 'TT',
    Caption: 'Tatar',
  },
  (err, recordId) => {
    console.dir({ insert: recordId });
  }
);
```

Generate UPDATE statement: connection.update(table, row, callback)

```js
connection.update(
  'Language',
  {
    LanguageId: 25,
    LanguageName: 'Tatarca',
    LanguageSign: 'TT',
    LanguageISO: 'TT',
    Caption: 'Tatarca',
  },
  (err, affectedRows) => {
    console.dir({ update: affectedRows });
  }
);
```

Generate UPDATE statement with "where": connection.update(table, row, where, callback)

```js
connection.update(
  'Language',
  { LanguageSign: 'TT' },
  { LanguageId: 1 },
  (err, affectedRows) => {
    console.dir({ update: affectedRows });
  }
);
```

Generate INSERT statement if record not exists or UPDATE if it exists: connection.upsert(table, row, callback)

```js
connection.upsert(
  'Language',
  {
    LanguageId: 25,
    LanguageName: 'Tatarca',
    LanguageSign: 'TT',
    LanguageISO: 'TT',
    Caption: 'Tatarca',
  },
  (err, affectedRows) => {
    console.dir({ upsert: affectedRows });
  }
);
```

Get record count: connection.count(table, whereFilter, callback)

```js
connection.count('Language', { LanguageId: '>3' }, (err, count) => {
  console.dir({ count });
  // count: 9
});
```

Generate DELETE statement: connection.delete(table, whereFilter, callback)

```js
connection.delete('Language', { LanguageSign: 'TT' }, (err, affectedRows) => {
  console.dir({ delete: affectedRows });
});
```

## License & Contributors

Copyright (c) 2012-2021 Metarhia &lt;timur.shemsedinov@gmail.com&gt;
See github for full [contributors list](https://github.com/tshemsedinov/node-mysql-utilities/graphs/contributors).
Node MySql Utilities is [MIT licensed](./LICENSE).
