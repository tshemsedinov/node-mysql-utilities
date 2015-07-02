'use strict';

var mysql = require('mysql');
var mysqlUtilities = require('./utilities');

var connection = mysql.createConnection({
  host:     'localhost',
  user:     'userName',
  password: 'userPassword',
  database: 'databaseName'
});

connection.connect();

mysqlUtilities.upgrade(connection);
mysqlUtilities.introspection(connection);

connection.slowTime = 100; // ms

connection.on('query', function(err, res, fields, query) {
  console.dir({onQuery:{err:err, query:query.sql}});
});

connection.on('slow', function(err, res, fields, query, executionTime) {
  console.dir({onSlow:{err:err, executionTime:executionTime, query:query.sql}});
});

console.log({
  where: connection.where({ id: 5, year: '>2010', price: '100..200', level: '<=3', sn: '*str?', label: 'str', code: '(1,2,4,10,11)' })
});

connection.select('_Language', '*', { LanguageId: '1..3' }, function(err, results) {
  console.dir({select:results,err:err});
});

connection.insert('_Language', {LanguageName:'Uygurian', LanguageSign:'UY', LanguageISO:'UY', Caption:'Uygurian'}, function(err, results) {
  console.dir({insert:results, err:err});
});

connection.update('_Language', {LanguageId: 1, LanguageName:'Qwertian', LanguageSign:'QW', LanguageISO:'QW', Caption:'Qwertian'}, function(err, results) {
  console.dir({update:results, err:err});
});

connection.update('_Language', {LanguageName:'QwertianA', LanguageSign:'QA'}, {LanguageId: 1}, function(err, results) {
  console.dir({update:results, err:err});
});

connection.upsert('_Language', {LanguageId: 1, LanguageName:'Qwertianian', LanguageSign:'QW', LanguageISO:'QW', Caption:'Qwertianian'}, function(err, results) {
  console.dir({upsert:results, err:err});
});

connection.delete('_Language', {LanguageSign:'UY'}, function(err, results) {
  console.dir({delete:results, err:err});
});

connection.query('SELECT * FROM _Language where LanguageId>?', [2], function(err, results) {
  console.dir({query:results});
});

connection.queryRow('SELECT * FROM _Language where LanguageId=?', [3], function(err, row) {
  console.dir({queryRow:row});
});

connection.queryValue('SELECT LanguageName FROM _Language where LanguageId=?', [8], function(err, name) {
  console.dir({queryValue:name});
});

connection.queryHash('SELECT LanguageSign,LanguageId,LanguageName,Caption,LanguageISO FROM _Language', [], function(err, arr) {
  console.dir({queryHash:arr});
});

connection.queryCol('SELECT LanguageSign FROM _Language', [], function(err, arr) {
  console.dir({queryCol:arr});
});

connection.queryKeyValue('SELECT LanguageISO,LanguageName FROM _Language', [], function(err, keyValue) {
  console.dir({queryKeyValue:keyValue});
});

connection.count('_Language', { LanguageId: '>3' }, function(err, count) {
  console.dir({count:count});
});

connection.primary('_Language', function(err, primary) {
  console.dir({primary:primary});
});

connection.foreign('_TemplateCaption', function(err, foreign) {
  console.dir({foreign:foreign});
});

connection.constraints('_TemplateCaption', function(err, constraints) {
  console.dir({constraints:constraints});
});

connection.fields('_Language', function(err, fields) {
  console.dir({fields:fields});
});

connection.databases(function(err, databases) {
  console.dir({databases:databases});
});

connection.tables(function(err, tables) {
  console.dir({tables:tables});
});

connection.databaseTables('mezha', function(err, tables) {
  console.dir({tables:tables});
});

connection.tableInfo('_Language', function(err, info) {
  console.dir({tableInfo:info});
});

connection.indexes('_Language', function(err, indexes) {
  console.dir({indexes:indexes});
});

connection.processes(function(err, processes) {
  console.dir({processes:processes});
});

connection.globalVariables(function(err, globalVariables) {
  console.dir({globalVariables:globalVariables});
});

connection.globalStatus(function(err, globalStatus) {
  console.dir({globalStatus:globalStatus});
});

connection.users(function(err, users) {
  console.dir({users:users});
});

setTimeout(function() { connection.end(); }, 2000);
