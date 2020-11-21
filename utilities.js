'use strict';

const identifierRegexp = /^[0-9,a-z,A-Z_.]*$/;

const escapeIdentifier = (str, quote) => {
  quote = quote || '`';
  if (identifierRegexp.test(str)) return str;
  return quote + str + quote;
};

if (typeof Function.prototype.override !== 'function') {
  Function.prototype.override = function (fn) {
    const superFunction = this;
    return function (...args) {
      this.inherited = superFunction;
      return fn.apply(this, args);
    };
  };
}

const buildCondition = (key, value, esc) => {
  for (const operator of ['>=', '<=', '<>', '>', '<']) {
    if (value.startsWith(operator)) {
      const s = value.substring(operator.length);
      return `${key} ${operator} ${esc(s)}`;
    }
  }
  if (value.startsWith('(')) {
    const list = value.substr(1, value.length - 2).split(',');
    const set = list.map(s => esc(s)).join(',');
    return `${key} IN (${set})`;
  }
  if (value.includes('..')) {
    const [begin, end] = value.split('..');
    return `(${key} BETWEEN ${begin} AND ${end})`;
  }
  if (value.includes('*') || value.includes('?')) {
    const val = value.replace(/\*/g, '%').replace(/\?/g, '_');
    return `${key} LIKE ${esc(val)}`;
  }
  return `${key} = ${esc(value)}`;
};

const upgrade = connection => {
  if (!connection._mixedUpgrade) {
    connection._mixedUpgrade = true;
    connection.slowTime = 2000;

    connection.query = connection.query.override(function (
      sql,
      values,
      callback
    ) {
      const startTime = new Date().getTime();
      if (typeof values === 'function') {
        callback = values;
        values = [];
      }
      const query = this.inherited(sql, values, (err, res, fields) => {
        const endTime = new Date().getTime();
        const executionTime = endTime - startTime;
        connection.emit('query', err, res, fields, query);
        if (connection.slowTime && executionTime >= connection.slowTime) {
          connection.emit('slow', err, res, fields, query, executionTime);
        }
        if (callback) callback(err, res, fields);
      });
      return query;
    });

    // Where clause builder
    //   Example: {
    //     id: 5, year: '>2010', price: '100..200',
    //     level: '<=3', sn: '*str?', label: 'str',
    //     code: '(1,2,4,10,11)' }
    //   Returns: 'id = 5 AND year > '2010' AND (price BETWEEN '100' AND '200')
    //     AND level <= '3' AND sn LIKE '%str_'
    //     AND label = 'str' AND code IN (1,2,4,10,11)'
    //
    connection.where = function (where) {
      const result = [];
      for (const key in where) {
        const value = where[key];
        if (typeof value === 'number') {
          result.push(`${key} = ${value.toString()}`);
        } else if (typeof value === 'string') {
          result.push(buildCondition(key, value, s => this.escape(s)));
        }
      }
      return result.join(' AND ');
    };

    // Order builder
    //   Example: { id: 'asc', name: 'desc' }
    //   Returns: 'id asc, name desc'
    //
    connection.order = function (order) {
      const result = [];
      let key, val, clause;
      for (key in order) {
        val = order[key];
        clause = key;
        result.push(clause + ' ' + val);
      }
      if (result.length) return result.join();
      return '';
    };

    // Record count
    //
    connection.count = function (table, where, callback) {
      where = this.where(where);
      let sql = 'SELECT count(*) FROM ' + escapeIdentifier(table);
      if (where) sql = sql + ' WHERE ' + where;
      return this.queryValue(sql, [], (err, res) => {
        callback(err, res);
      });
    };

    // Returns single row as associative array of fields
    //
    connection.queryRow = function (sql, values, callback) {
      if (typeof values === 'function') {
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
    connection.queryValue = function (sql, values, callback) {
      if (typeof values === 'function') {
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
    connection.queryCol = function (sql, values, callback) {
      if (typeof values === 'function') {
        callback = values;
        values = [];
      }
      return this.query(sql, values, (err, res, fields) => {
        if (err) return callback(err);
        const result = [];
        let i, row, keys;
        for (i in res) {
          row = res[i];
          keys = Object.keys(row);
          result.push(row[keys[0]]);
        }
        callback(err, result, fields);
      });
    };

    // Query returning hash (associative array), first field will be array key
    //
    connection.queryHash = function (sql, values, callback) {
      if (typeof values === 'function') {
        callback = values;
        values = [];
      }
      return this.query(sql, values, (err, res, fields) => {
        if (err) return callback(err);
        const result = {};
        let i, row, keys;
        for (i in res) {
          row = res[i];
          keys = Object.keys(row);
          result[row[keys[0]]] = row;
        }
        callback(err, result, fields);
      });
    };

    // Query returning key-value array,
    // first field of query will be key and second will be value
    //
    connection.queryKeyValue = function (sql, values, callback) {
      if (typeof values === 'function') {
        callback = values;
        values = [];
      }
      return this.query(sql, values, (err, res, fields) => {
        if (err) return callback(err);
        const result = {};
        let i, row, keys;
        for (i in res) {
          row = res[i];
          keys = Object.keys(row);
          result[row[keys[0]]] = row[keys[1]];
        }
        callback(err, result, fields);
      });
    };

    // SELECT SQL statement generator
    //
    connection.select = function (table, fields, where, order, callback) {
      where = this.where(where);
      if (typeof order === 'function') {
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
    connection.selectLimit = function (
      table,
      fields,
      limit,
      where,
      order,
      callback
    ) {
      where = this.where(where);
      if (typeof order === 'function') {
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
    connection.insert = function (table, row, callback) {
      this.fields(table, (err, fields) => {
        if (err) {
          return callback(
            new Error('Error: Table "' + table + '" not found'),
            false
          );
        }
        fields = Object.keys(fields);
        const rowKeys = Object.keys(row);
        const values = [];
        const columns = [];
        let i, field;
        for (i in fields) {
          field = fields[i];
          if (rowKeys.includes(field)) {
            columns.push(field);
            values.push(this.escape(row[field]));
          }
        }
        const query = this.query(
          'INSERT INTO ' +
            escapeIdentifier(table) +
            ' (' +
            columns.join(', ') +
            ') VALUES (' +
            values.join(', ') +
            ')',
          [],
          (err, res) => {
            callback(err, res ? res.insertId : false, query);
          }
        );
      });
    };

    // UPDATE SQL statement generator
    //
    connection.update = function (table, row, where, callback) {
      if (typeof where === 'function') {
        callback = where;
        this.fields(table, (err, fields) => {
          if (err) {
            const error = new Error('Error: Table "' + table + '" not found');
            return callback(error);
          }
          let where = '';
          const data = [];
          const rowKeys = Object.keys(row);
          let i, field, fieldName;
          for (i in fields) {
            field = fields[i];
            fieldName = field.Field;
            if (rowKeys.includes(fieldName)) {
              if (!where && (field.Key === 'PRI' || field.Key === 'UNI')) {
                where = fieldName + '=' + this.escape(row[fieldName]);
              } else {
                data.push(fieldName + '=' + this.escape(row[fieldName]));
              }
            }
          }
          if (where) {
            const query = this.query(
              'UPDATE ' +
                escapeIdentifier(table) +
                ' SET ' +
                data.join(', ') +
                ' WHERE ' +
                where,
              [],
              (err, res) => {
                callback(err, res ? res.changedRows : false, query);
              }
            );
          } else {
            const e = new Error(
              'Error: can not insert into "' +
                table +
                '" because there is no primary or unique key specified'
            );
            this.emit('error', e);
            callback(e, false);
          }
        });
      } else {
        where = this.where(where);
        if (where) {
          const data = [];
          let i;
          for (i in row) data.push(i + '=' + this.escape(row[i]));
          const query = this.query(
            'UPDATE ' +
              escapeIdentifier(table) +
              ' SET ' +
              data.join(', ') +
              ' WHERE ' +
              where,
            [],
            (err, res) => {
              callback(err, res ? res.changedRows : false, query);
            }
          );
        } else {
          const e = new Error(
            'Error: can update "' +
              table +
              '", because "where" parameter is empty'
          );
          this.emit('error', e);
          callback(e, false);
        }
      }
    };

    // INSERT OR UPDATE SQL statement generator
    //
    connection.upsert = function (table, row, callback) {
      this.fields(table, (err, fields) => {
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
            rowKeys.includes(fieldName)
          ) {
            uniqueKey = fieldName;
          }
        }
        if (rowKeys.includes(uniqueKey)) {
          this.queryValue(
            'SELECT count(*) FROM ' +
              escapeIdentifier(table) +
              ' WHERE ' +
              uniqueKey +
              '=' +
              this.escape(row[uniqueKey]),
            [],
            (err, count) => {
              if (count === 1) this.update(table, row, callback);
              else this.insert(table, row, callback);
            }
          );
        } else {
          const e = new Error(
            'Error: can not insert or update table "' +
              table +
              '", primary or unique key is not specified'
          );
          this.emit('error', e);
          callback(e, false);
        }
      });
    };

    // DELETE SQL statement generator
    //   callback(err, rowCount or false)
    //
    connection.delete = function (table, where, callback) {
      where = this.where(where);
      if (where) {
        const query = this.query(
          'DELETE FROM ' + escapeIdentifier(table) + ' WHERE ' + where,
          [],
          (err, res) => {
            callback(err, res ? res.affectedRows : false, query);
          }
        );
      } else {
        const e = new Error(
          'Error: can not delete from "' +
            table +
            '", because "where" parameter is empty'
        );
        this.emit('error', e);
        callback(e, false);
      }
    };
  }
};

const introspection = connection => {
  if (!connection._mixedIntrospection) {
    connection._mixedIntrospection = true;

    // Get primary key metadata
    //   callback(err, row)
    //
    connection.primary = function (table, callback) {
      this.queryRow(
        'SHOW KEYS FROM ' +
          escapeIdentifier(table) +
          ' WHERE Key_name = "PRIMARY"',
        [],
        (err, res) => {
          if (err) res = false;
          callback(err, res);
        }
      );
    };

    // Get foreign key metadata
    //   callback(err, foreign)
    //
    connection.foreign = function (table, callback) {
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
    connection.constraints = function (table, callback) {
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
    connection.fields = function (table, callback) {
      this.queryHash(
        'SHOW FULL COLUMNS FROM ' + escapeIdentifier(table),
        [],
        (err, res) => {
          if (err) res = false;
          callback(err, res);
        }
      );
    };

    // Get connection databases array
    //   callback(err, databases)
    //
    connection.databases = function (callback) {
      this.queryCol('SHOW DATABASES', [], (err, res) => {
        if (err) res = false;
        callback(err, res);
      });
    };

    // Get database tables list
    //   callback(err, tables)
    //
    connection.databaseTables = function (database, callback) {
      this.queryHash(
        'SELECT TABLE_NAME, TABLE_TYPE, ENGINE, VERSION, ROW_FORMAT, ' +
          'TABLE_ROWS, AVG_ROW_LENGTH, DATA_LENGTH, MAX_DATA_LENGTH, ' +
          'INDEX_LENGTH, DATA_FREE, AUTO_INCREMENT, CREATE_TIME, ' +
          'UPDATE_TIME, CHECK_TIME, TABLE_COLLATION, CHECKSUM, ' +
          'CREATE_OPTIONS, TABLE_COMMENT ' +
          'FROM information_schema.TABLES WHERE TABLE_SCHEMA = ?',
        [database],
        (err, res) => {
          if (err) res = false;
          callback(err, res);
        }
      );
    };

    // Get current database table metadata
    //   callback(err, tables)
    //
    connection.tables = function (callback) {
      this.queryHash(
        'SELECT TABLE_NAME, TABLE_TYPE, ENGINE, VERSION, ROW_FORMAT, ' +
          'TABLE_ROWS, AVG_ROW_LENGTH, DATA_LENGTH, MAX_DATA_LENGTH, ' +
          'INDEX_LENGTH, DATA_FREE, AUTO_INCREMENT, CREATE_TIME, ' +
          'UPDATE_TIME, CHECK_TIME, TABLE_COLLATION, CHECKSUM, ' +
          'CREATE_OPTIONS, TABLE_COMMENT ' +
          'FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE()',
        [],
        (err, res) => {
          if (err) res = false;
          callback(err, res);
        }
      );
    };

    // Get table metadata info
    //   callback(err, metadata)
    //
    connection.tableInfo = function (table, callback) {
      this.queryRow('SHOW TABLE STATUS LIKE ?', [table], (err, res) => {
        if (err) res = false;
        callback(err, res);
      });
    };

    // Get table indexes metadata
    //   callback(err, indexes)
    //
    connection.indexes = function (table, callback) {
      this.query(
        'SHOW INDEX FROM ' + escapeIdentifier(table),
        [],
        (err, res) => {
          const result = {};
          if (err) {
            callback(err, false);
            return;
          }
          let i, row;
          for (i in res) {
            row = res[i];
            result[row.Key_name] = row;
          }
          callback(err, result);
        }
      );
    };

    // Get server process list
    //   callback(err, processes)
    //
    connection.processes = function (callback) {
      this.query(
        'SELECT * FROM information_schema.PROCESSLIST',
        [],
        (err, res) => {
          if (err) res = false;
          callback(err, res);
        }
      );
    };

    // Get server global variables
    //   callback(err, variables)
    //
    connection.globalVariables = function (callback) {
      this.queryKeyValue(
        'SELECT * FROM information_schema.GLOBAL_VARIABLES',
        [],
        (err, res) => {
          if (err) res = false;
          callback(err, res);
        }
      );
    };

    // Get server global status
    //   callback(err, status)
    //
    connection.globalStatus = function (callback) {
      this.queryKeyValue(
        'SELECT * FROM information_schema.GLOBAL_STATUS',
        [],
        (err, res) => {
          if (err) res = false;
          callback(err, res);
        }
      );
    };

    // Get database users
    //   callback(err, users)
    //
    connection.users = function (callback) {
      this.query('SELECT * FROM mysql.user', [], (err, res) => {
        if (err) res = false;
        callback(err, res);
      });
    };
  }
};

module.exports = {
  upgrade,
  introspection,
};
