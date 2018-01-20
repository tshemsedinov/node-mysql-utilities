'use strict';

const identifierRegexp = /^[0-9,a-z,A-Z_.]*$/;

const escapeIdentifier = (str, quote) => {
  quote = quote || '`';
  if (identifierRegexp.test(str)) return str;
  else return quote + str + quote;
};

const startsWith = (value, str) => (
  value.slice(0, str.length) === str
);

if (typeof(Function.prototype.override) !== 'function') {
  Function.prototype.override = function(fn) {
    const superFunction = this;
    return (...args) => {
      this.inherited = superFunction;
      return fn.apply(this, args);
    };
  };
}

function upgrade(connection) {

  if (!connection._mixedUpgrade) {

    connection._mixedUpgrade = true;
    connection.slowTime = 2000;

    connection.query = connection.query.override(
      function(sql, values, callback) {
        const startTime = new Date().getTime();
        if (typeof(values) === 'function') {
          callback = values;
          values = [];
        }
        const query = this.inherited(sql, values, (err, res, fields) => {
          const endTime = new Date().getTime();
          const executionTime = endTime - startTime;
          connection.emit('query', err, res, fields, query);
          if (connection.slowTime && (executionTime >= connection.slowTime)) {
            connection.emit('slow', err, res, fields, query, executionTime);
          }
          if (callback) callback(err, res, fields);
        });
        return query;
      }
    );

    // Where clause builder
    //   Example: {
    //     id: 5, year: '>2010', price: '100..200',
    //     level: '<=3', sn: '*str?', label: 'str',
    //     code: '(1,2,4,10,11)' }
    //   Returns: 'id = 5 AND year > '2010' AND (price BETWEEN '100' AND '200')
    //     AND level <= '3' AND sn LIKE '%str_'
    //     AND label = 'str' AND code IN (1,2,4,10,11)'
    //
    connection.where = function(where) {
      const dbc = this;
      let result = '';
      let value, clause;
      for (const key in where) {
        value = where[key];
        clause = key;
        if (typeof(value) === 'number') {
          clause = key + ' = ' + value;
        } else if (typeof(value) === 'string') {
          if (startsWith(value, '>=')) {
            clause = key + ' >= ' + dbc.escape(value.substring(2));
          } else if (startsWith(value, '<=')) {
            clause = key + ' <= ' + dbc.escape(value.substring(2));
          } else if (startsWith(value, '<>')) {
            clause = key + ' <> ' + dbc.escape(value.substring(2));
          } else if (startsWith(value, '>')) {
            clause = key + ' > ' + dbc.escape(value.substring(1));
          } else if (startsWith(value, '<')) {
            clause = key + ' < ' + dbc.escape(value.substring(1));
          } else if (startsWith(value, '(')) {
            clause = (
              key + ' IN (' + (value
                .substr(1, value.length - 2)
                .split(',')
                .map(s => dbc.escape(s))
              ).join(',') + ')'
            );
          } else if (value.indexOf('..') !== -1) {
            value = value.split('..');
            clause = (
              '(' + key + ' BETWEEN ' +
              dbc.escape(value[0]) + ' AND ' +
              dbc.escape(value[1]) + ')'
            );
          } else if (
            value.indexOf('*') !== -1 ||
            value.indexOf('?') !== -1
          ) {
            value = value.replace(/\*/g, '%').replace(/\?/g, '_');
            clause = key + ' LIKE ' + dbc.escape(value);
          } else {
            clause = key + ' = ' + dbc.escape(value);
          }
        }
        result = result ? (result + ' AND ' + clause) : clause;
      }
      return result;
    };

    // Order builder
    //   Example: { id: 'asc', name: 'desc' }
    //   Returns: 'id asc, name desc'
    //
    connection.order = function(order) {
      const result = [];
      let val, clause;
      for (const key in order) {
        val = order[key];
        clause = key;
        result.push(clause + ' ' + val);
      }
      if (result.length) return result.join();
      else return '';
    };

    // Record count
    //
    connection.count = function(table, where, callback) {
      where = this.where(where);
      let sql = 'SELECT count(*) FROM ' + escapeIdentifier(table);
      if (where) sql = sql + ' WHERE ' + where;
      return this.queryValue(sql, [], (err, res) => {
        callback(err, res);
      });
    };

    // Returns single row as associative array of fields
    //
    connection.queryRow = function(sql, values, callback) {
      if (typeof(values) === 'function') {
        callback = values;
        values = [];
      }
      return this.query(sql, values, (err, res, fields) => {
        if (err) return callback(err);
        res = res[0] ? res[0] : false;
        callback(err, res, fields);
      });
    };

    // Returns single value (scalar)
    //
    connection.queryValue = function(sql, values, callback) {
      if (typeof(values) === 'function') {
        callback = values;
        values = [];
      }
      return this.queryRow(sql, values, (err, res, fields) => {
        if (err) return callback(err);
        const value = res[Object.keys(res)[0]];
        callback(err, value, fields);
      });
    };

    // Query returning array of column field values
    //
    connection.queryCol = function(sql, values, callback) {
      if (typeof(values) === 'function') {
        callback = values;
        values = [];
      }
      return this.query(sql, values, (err, res, fields) => {
        if (err) return callback(err);
        const result = [];
        let row;
        for (const i in res) {
          row = res[i];
          result.push(row[Object.keys(row)[0]]);
        }
        callback(err, result, fields);
      });
    };

    // Query returning hash (associative array), first field will be array key
    //
    connection.queryHash = function(sql, values, callback) {
      if (typeof(values) === 'function') {
        callback = values;
        values = [];
      }
      return this.query(sql, values, (err, res, fields) => {
        if (err) return callback(err);
        const result = {};
        let row;
        for (const i in res) {
          row = res[i];
          result[row[Object.keys(row)[0]]] = row;
        }
        callback(err, result, fields);
      });
    };

    // Query returning key-value array,
    // first field of query will be key and second will be value
    //
    connection.queryKeyValue = function(sql, values, callback) {
      if (typeof(values) === 'function') {
        callback = values;
        values = [];
      }
      return this.query(sql, values, (err, res, fields) => {
        if (err) return callback(err);
        const result = {};
        let i, row;
        for (i in res) {
          row = res[i];
          result[row[Object.keys(row)[0]]] = row[Object.keys(row)[1]];
        }
        callback(err, result, fields);
      });
    };

    // SELECT SQL statement generator
    //
    connection.select = function(table, fields, where, order, callback) {
      where = this.where(where);
      if (typeof(order) === 'function') {
        callback = order;
        order = {};
      }
      order = this.order(order);
      let sql = 'SELECT ' + fields + ' FROM ' + escapeIdentifier(table);
      if (where) sql = sql + ' WHERE ' + where;
      if (order) sql = sql + ' ORDER BY ' + order;
      const query = this.query(sql, [], (err, res) => {
        callback(err, res, query);
      });
    };

    // SELECT SQL statement generator by LIMIT
    //
    connection.selectLimit = function(
      table, fields, limit, where, order, callback
    ) {
      where = this.where(where);
      if (typeof(order) === 'function') {
        callback = order;
        order = {};
      }
      order = this.order(order);
      let sql = 'SELECT ' + fields + ' FROM ' + escapeIdentifier(table);
      if (where) sql = sql + ' WHERE ' + where;
      if (order) sql = sql + ' ORDER BY ' + order;
      sql = sql + ' LIMIT ' + limit.join();
      const query = this.query(sql, [], (err, res) => {
        callback(err, res, query);
      });
    };

    // INSERT SQL statement generator
    //   callback(err, id or false)
    //
    connection.insert = function(table, row, callback) {
      const dbc = this;
      dbc.fields(table, (err, fields) => {
        if (err) {
          return callback(
            new Error(
              'Error: Table "' + table + '" not found'
            ), false
          );
        }
        fields = Object.keys(fields);
        const rowKeys = Object.keys(row);
        let values = [];
        let columns = [];
        let i, field;
        for (i in fields) {
          field = fields[i];
          if (rowKeys.indexOf(field) !== -1) {
            columns.push(field);
            values.push(dbc.escape(row[field]));
          }
        }
        values = values.join(', ');
        columns = columns.join(', ');
        const query = dbc.query(
          'INSERT INTO ' + escapeIdentifier(table) +
          ' (' + columns + ') VALUES (' + values + ')',
          [], (err, res) => {
            callback(err, res ? res.insertId : false, query);
          }
        );
      });
    };

    // UPDATE SQL statement generator
    //
    connection.update = function(table, row, where, callback) {
      const dbc = this;
      if (typeof(where) === 'function') {
        callback = where;
        dbc.fields(table, (err, fields) => {
          if (err) {
            const error = new Error('Error: Table "' + table + '" not found');
            return callback(error);
          }
          let where = '';
          let data = [];
          const rowKeys = Object.keys(row);
          let field, fieldName;
          for (const i in fields) {
            field = fields[i];
            fieldName = field.Field;
            if (rowKeys.indexOf(fieldName) !== -1) {
              if (!where && (field.Key === 'PRI' || field.Key === 'UNI')) {
                where = fieldName + '=' + dbc.escape(row[fieldName]);
              } else {
                data.push(fieldName + '=' + dbc.escape(row[fieldName]));
              }
            }
          }
          if (where) {
            data = data.join(', ');
            const query = dbc.query(
              'UPDATE ' + escapeIdentifier(table) + ' SET ' + data +
              ' WHERE ' + where, [], (err, res) => {
                callback(err, res ? res.changedRows : false, query);
              }
            );
          } else {
            const e = new Error(
              'Error: can not insert into "' + table +
              '" because there is no primary or unique key specified'
            );
            dbc.emit('error', e);
            callback(e, false);
          }
        });
      } else {
        where = this.where(where);
        if (where) {
          let data = [];
          for (const i in row) data.push(i + '=' + dbc.escape(row[i]));
          data = data.join(', ');
          const query = dbc.query(
            'UPDATE ' + escapeIdentifier(table) +
            ' SET ' + data + ' WHERE ' + where, [],
            (err, res) => {
              callback(err, res ? res.changedRows : false, query);
            }
          );
        } else {
          const e = new Error(
            'Error: can update "' + table +
            '", because "where" parameter is empty'
          );
          dbc.emit('error', e);
          callback(e, false);
        }
      }
    };

    // INSERT OR UPDATE SQL statement generator
    //
    connection.upsert = function(table, row, callback) {
      const dbc = this;
      dbc.fields(table, (err, fields) => {
        if (err) {
          const error = new Error('Error: Table "' + table + '" not found');
          return callback(error);
        }
        const rowKeys = Object.keys(row);
        let uniqueKey = '';
        let i, field, fieldName;
        for (i in fields) {
          field = fields[i];
          fieldName = field.Field;
          if (
            !uniqueKey &&
            (field.Key === 'PRI' || field.Key === 'UNI') &&
            rowKeys.indexOf(fieldName) !== -1
          ) {
            uniqueKey = fieldName;
          }
        }
        if (rowKeys.indexOf(uniqueKey) !== -1) {
          dbc.queryValue(
            'SELECT count(*) FROM ' + escapeIdentifier(table) +
            ' WHERE ' + uniqueKey + '=' + dbc.escape(row[uniqueKey]), [],
            (err, count) => {
              if (count === 1) dbc.update(table, row, callback);
              else dbc.insert(table, row, callback);
            }
          );
        } else {
          const e = new Error(
            'Error: can not insert or update table "' + table +
            '", primary or unique key is not specified'
          );
          dbc.emit('error', e);
          callback(e, false);
        }
      });
    };

    // DELETE SQL statement generator
    //   callback(err, rowCount or false)
    //
    connection.delete = function(table, where, callback) {
      const dbc = this;
      where = this.where(where);
      if (where) {
        const query = dbc.query(
          'DELETE FROM ' + escapeIdentifier(table) + ' WHERE ' + where, [],
          (err, res) => {
            callback(err, res ? res.affectedRows : false, query);
          }
        );
      } else {
        const e = new Error(
          'Error: can not delete from "' + table +
          '", because "where" parameter is empty'
        );
        dbc.emit('error', e);
        callback(e, false);
      }
    };

  }
}

function introspection(connection) {

  if (!connection._mixedIntrospection) {

    connection._mixedIntrospection = true;

    // Get primary key metadata
    //   callback(err, row)
    //
    connection.primary = function(table, callback) {
      this.queryRow(
        'SHOW KEYS FROM ' + escapeIdentifier(table) +
        ' WHERE Key_name = "PRIMARY"', [],
        (err, res) => {
          if (err) res = false;
          callback(err, res);
        }
      );
    };

    // Get foreign key metadata
    //   callback(err, foreign)
    //
    connection.foreign = function(table, callback) {
      this.queryHash(
        'SELECT CONSTRAINT_NAME, COLUMN_NAME, ORDINAL_POSITION, ' +
        'POSITION_IN_UNIQUE_CONSTRAINT, REFERENCED_TABLE_NAME, ' +
        'REFERENCED_COLUMN_NAME FROM information_schema.KEY_COLUMN_USAGE ' +
        'WHERE REFERENCED_TABLE_NAME IS NOT NULL AND ' +
        'CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = ? ' +
        'ORDER BY REFERENCED_TABLE_NAME',
        [table],
        (err, res) => {
          if (err) res = false;
          callback(err, res);
        }
      );
    };

    // Get table constraints metadata
    //   callback(err, constraints)
    //
    connection.constraints = function(table, callback) {
      this.queryHash(
        'SELECT CONSTRAINT_NAME, UNIQUE_CONSTRAINT_NAME, ' +
        'REFERENCED_TABLE_NAME, MATCH_OPTION, UPDATE_RULE, DELETE_RULE ' +
        'FROM information_schema.REFERENTIAL_CONSTRAINTS ' +
        'WHERE TABLE_NAME = ? ' +
        'ORDER BY CONSTRAINT_NAME',
        [table],
        (err, res) => {
          if (err) res = false;
          callback(err, res);
        }
      );
    };

    // Get table fields metadata
    //   callback(err, fields)
    //
    connection.fields = function(table, callback) {
      this.queryHash(
        'SHOW FULL COLUMNS FROM ' +
        escapeIdentifier(table), [],
        (err, res) => {
          if (err) res = false;
          callback(err, res);
        }
      );
    };

    // Get connection databases array
    //   callback(err, databases)
    //
    connection.databases = function(callback) {
      this.queryCol('SHOW DATABASES', [], (err, res) => {
        if (err) res = false;
        callback(err, res);
      });
    };

    // Get database tables list
    //   callback(err, tables)
    //
    connection.databaseTables = function(database, callback) {
      this.queryHash(
        'SELECT TABLE_NAME, TABLE_TYPE, ENGINE, VERSION, ROW_FORMAT, ' +
        'TABLE_ROWS, AVG_ROW_LENGTH, DATA_LENGTH, MAX_DATA_LENGTH, ' +
        'INDEX_LENGTH, DATA_FREE, AUTO_INCREMENT, CREATE_TIME, ' +
        'UPDATE_TIME, CHECK_TIME, TABLE_COLLATION, CHECKSUM, ' +
        'CREATE_OPTIONS, TABLE_COMMENT ' +
        'FROM information_schema.TABLES WHERE TABLE_SCHEMA = ?', [database],
        (err, res) => {
          if (err) res = false;
          callback(err, res);
        }
      );
    };

    // Get current database table metadata
    //   callback(err, tables)
    //
    connection.tables = function(callback) {
      this.queryHash(
        'SELECT TABLE_NAME, TABLE_TYPE, ENGINE, VERSION, ROW_FORMAT, ' +
        'TABLE_ROWS, AVG_ROW_LENGTH, DATA_LENGTH, MAX_DATA_LENGTH, ' +
        'INDEX_LENGTH, DATA_FREE, AUTO_INCREMENT, CREATE_TIME, ' +
        'UPDATE_TIME, CHECK_TIME, TABLE_COLLATION, CHECKSUM, ' +
        'CREATE_OPTIONS, TABLE_COMMENT ' +
        'FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE()', [],
        (err, res) => {
          if (err) res = false;
          callback(err, res);
        }
      );
    };

    // Get table metadata info
    //   callback(err, metadata)
    //
    connection.tableInfo = function(table, callback) {
      this.queryRow('SHOW TABLE STATUS LIKE ?', [table], (err, res) => {
        if (err) res = false;
        callback(err, res);
      });
    };

    // Get table indexes metadata
    //   callback(err, indexes)
    //
    connection.indexes = function(table, callback) {
      this.query(
        'SHOW INDEX FROM ' + escapeIdentifier(table), [],
        (err, res) => {
          let result = {};
          if (err) result = false; else {
            let row;
            for (const i in res) {
              row = res[i];
              result[row.Key_name] = row;
            }
          }
          callback(err, result);
        }
      );
    };

    // Get server process list
    //   callback(err, processes)
    //
    connection.processes = function(callback) {
      this.query(
        'SELECT * FROM information_schema.PROCESSLIST', [],
        (err, res) => {
          if (err) res = false;
          callback(err, res);
        }
      );
    };

    // Get server global variables
    //   callback(err, variables)
    //
    connection.globalVariables = function(callback) {
      this.queryKeyValue(
        'SELECT * FROM information_schema.GLOBAL_VARIABLES', [],
        (err, res) => {
          if (err) res = false;
          callback(err, res);
        }
      );
    };

    // Get server global status
    //   callback(err, status)
    //
    connection.globalStatus = function(callback) {
      this.queryKeyValue(
        'SELECT * FROM information_schema.GLOBAL_STATUS', [],
        (err, res) => {
          if (err) res = false;
          callback(err, res);
        }
      );
    };

    // Get database users
    //   callback(err, users)
    //
    connection.users = function(callback) {
      this.query(
        'SELECT * FROM mysql.user', [],
        (err, res) => {
          if (err) res = false;
          callback(err, res);
        }
      );
    };

  }
}

module.exports = {
  upgrade,
  introspection,
};
