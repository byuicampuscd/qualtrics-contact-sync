/* eslint no-console:1 */

/* This module exports a single function which requires a csvFile object.
 * The module hashes the JSON stringified contents of the csv and compares 
 * the result to the previously saved hash to identify changes in the document 
 * In addition it updated the config file with the new hashes */

const stringHash = require('string-hash');
const chalk = require('chalk');
const fs = require('fs');
const d3 = require('d3-dsv');
const log = require('./writeReport.js');
const settings = require('./settings.json');



function checkHash(csvFile, waterfallCb) {
    var hash = stringHash(JSON.stringify(csvFile.csvContacts));

    if (csvFile.config.hash == hash) {
        console.log(chalk.green('Hashes Matched'));
        csvFile.report.matchingHash = true;
        log.writeFile(csvFile, writeErr => {
            if (writeErr) console.error(chalk.red(writeErr));
            waterfallCb(null, csvFile);
        });
    } else {
        csvFile.report.matchingHash = false;
        csvFile.report.newHash = hash;
        waterfallCb(null, csvFile);
    }
}

/* updating the log file should live here too!! */

function updateHash(csvFiles, cb) {
    console.log('updateHash called');

    var config = csvFiles.map(csvFile => {
        if (!csvFile.report.matchingHash && csvFile.report.failed.length == 0) {
            csvFile.config.hash = csvFile.report.newHash;
        }
        return csvFile.config;
    });

    config = d3.csvFormat((config));

    fs.writeFile(settings.configFile, config, writeErr => {
        if(writeErr) {
            cb(writeErr);
            return;
        }
        cb();
    });
}


module.exports = {
    checkHash: checkHash,
    updateHash: updateHash,
};