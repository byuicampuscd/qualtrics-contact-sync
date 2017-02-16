/*eslint-env:node*/
/*eslint no-console:0*/
'use strict';

var ls = function () {},
    proto = ls.prototype;

const fs = require('fs'),
    d3 = require('d3-dsv'),
    path = require('path'),
    chalk = require('chalk'),
    studentSnatcher = require('./studentSnatcher'),
    optionSnatcher = require('./optionSnatcher'),
    ss = new studentSnatcher(),
    os = new optionSnatcher();


function giveFeedback(noFile, noML) {
    console.log(chalk.red("\nTheses Mailing lists don't have matching files:"));
    noFile.forEach(function (file) {
        console.log(file);
    });

    console.log(chalk.red("\nTheses Files don't have matching Mailing Lists:"));
    noML.forEach(function (ml) {
        console.log(ml);
    });
}

function filterMailingLists(files, mailingLists, cb) {
    var links = [],
        noFile = [];

    mailingLists.forEach(function (ml) {
        //remove cultter
        delete ml.libraryId;
        delete ml.category;
        delete ml.folder;

        //strip whitespace out for comparison
        var name = ml.name.replace(/\s/g, '');

        //magic logic that finds matches
        var fileIndex = files.findIndex(function (file) {
            return file === name;
        });
        if (fileIndex > -1) {
            ml.filePath = 'lists/QualtricsSync-' + files[fileIndex] + '.csv';
            links.push(ml);
            files.splice(fileIndex, 1);
        } else {
            noFile.push(ml.name);
        }
    });

    giveFeedback(noFile, files); //remaining files have no ML

    cb(links);
}

function getMailingLists(files, cb) {
    var option = os.getMLs();
    ss.getMailingLists(option, function (err, mailingLists) {
        if (err) throw new Error(err);
        filterMailingLists(files, mailingLists, cb);
    });
}

// get fileNames from directory
// originally getFileNames
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
