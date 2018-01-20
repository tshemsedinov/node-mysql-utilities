'use strict';

const mysql = require('mysql');
const mysqlUtilities = require('./utilities');

const connection = mysql.createConnection({
  host: 'localhost',
  user: 'travis',
  password: '',
  database: 'db',
});

connection.connect();

mysqlUtilities.upgrade(connection);
mysqlUtilities.introspection(connection);

connection.slowTime = 100; // ms

connection.on('query', (err, res, fields, query) => {
  console.dir({ onQuery: { err, query: query.sql } });
});

connection.on('slow', (err, res, fields, query, executionTime) => {
  console.dir({
    onSlow: { err, executionTime, query: query.sql }
  });
});

console.log({
  where: connection.where({
    id: 5, year: '>2010', price: '100..200',
    level: '<=3', sn: '*str?', label: 'str',
    code: '(1,2,4,10,11)'
  })
});

connection.select(
  '_Language', '*',
  { LanguageId: '1..3' },
  (err, results) => {
    console.dir({ select: results, err });
  }
);

connection.insert(
  '_Language',
  { LanguageName: 'Uygurian', LanguageSign: 'UY',
    LanguageISO: 'UY', Caption: 'Uygurian' },
  (err, results) => {
    console.dir({ insert: results, err });
  }
);

connection.update(
  '_Language',
  { LanguageId: 1, LanguageName: 'Qwertian',
    LanguageSign: 'QW', LanguageISO: 'QW',
    Caption: 'Qwertian' },
  (err, results) => {
    console.dir({ update: results, err });
  }
);

connection.update(
  '_Language',
  { LanguageName: 'QwertianA', LanguageSign: 'QA' },
  { LanguageId: 1 },
  (err, results) => {
    console.dir({ update: results, err });
  }
);

connection.upsert(
  '_Language',
  { LanguageId: 1,
    LanguageName: 'Qwertianian', LanguageSign: 'QW',
    LanguageISO: 'QW', Caption: 'Qwertianian' },
  (err, results) => {
    console.dir({ upsert: results, err });
  }
);

connection.delete(
  '_Language',
  { LanguageSign: 'UY' },
  (err, results) => {
    console.dir({ delete: results, err });
  }
);

connection.query(
  'SELECT * FROM _Language where LanguageId > ?', [2],
  (err, results) => {
    console.dir({ query: results });
  }
);

connection.queryRow(
  'SELECT * FROM _Language where LanguageId = ?', [3],
  (err, row) => {
    console.dir({ queryRow: row });
  }
);

connection.queryValue(
  'SELECT LanguageName FROM _Language where LanguageId = ?', [8],
  (err, name) => {
    console.dir({ queryValue: name });
  }
);

connection.queryHash(
  'SELECT LanguageSign, LanguageId, LanguageName, Caption, LanguageISO ' +
  'FROM _Language', [],
  (err, arr) => {
    console.dir({ queryHash: arr });
  }
);

connection.queryCol(
  'SELECT LanguageSign FROM _Language', [],
  (err, arr) => {
    console.dir({ queryCol: arr });
  }
);

connection.queryKeyValue(
  'SELECT LanguageISO, LanguageName FROM _Language', [],
  (err, keyValue) => {
    console.dir({ queryKeyValue: keyValue });
  }
);

connection.count('_Language', { LanguageId: '>3' }, (err, count) => {
  console.dir({ count });
});

connection.primary('_Language', (err, primary) => {
  console.dir({ primary });
});

connection.foreign('_TemplateCaption', (err, foreign) => {
  console.dir({ foreign });
});

connection.constraints('_TemplateCaption', (err, constraints) => {
  console.dir({ constraints });
});

connection.fields('_Language', (err, fields) => {
  console.dir({ fields });
});

connection.databases((err, databases) => {
  console.dir({ databases });
});

connection.tables((err, tables) => {
  console.dir({ tables });
});

connection.databaseTables('mezha', (err, tables) => {
  console.dir({ tables });
});

connection.tableInfo('_Language', (err, info) => {
  console.dir({ tableInfo: info });
});

connection.indexes('_Language', (err, indexes) => {
  console.dir({ indexes });
});

connection.processes((err, processes) => {
  console.dir({ processes });
});

connection.globalVariables((err, globalVariables) => {
  console.dir({ globalVariables });
});

connection.globalStatus((err, globalStatus) => {
  console.dir({ globalStatus });
});

connection.users((err, users) => {
  console.dir({ users });
});

setTimeout(() => { connection.end(); }, 2000);
