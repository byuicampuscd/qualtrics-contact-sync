/*eslint-env:node*/
/*eslint no-console:0*/
'use strict';

var ls = function () {},
    proto = ls.prototype;

const fs = require('fs'),
    path = require('path');

// get fileNames from directory
proto.snatchLinks = function (cb) {
    fs.readdir('lists/', function (err, files) {
        if (err) throw new Error(err);

        files = files.filter(function (file) {
            return path.extname(file) === '.csv';
        });

        var filteredFiles = files.map(function (file) {
            // use a regExp??
            file = file.replace('QualtricsSync-', '');
            file = file.replace('.csv', '');
            return file;
        });
        getMailingLists(filteredFiles, cb);
    });
}

module.exports = ls;
