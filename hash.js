/* eslint no-console:1 */

/* This module exports a single function which requires a csvFile object.
 * The module hashes the JSON stringified contents of the csv and compares 
 * the result to the previously saved hash to identify changes in the document 
 * In addition it updated the config file with the new hashes */

const stringHash = require('string-hash');
const log = require('./generateReport.js');
const chalk = require('chalk');



function checkHash (csvFile, waterfallCb) {
    var hash = stringHash(JSON.stringify(csvFile.contacts));

    if (csvFile.config.hash === hash) {
        console.log(chalk.green('Hashed Matched'));
        csvFile.report.matchingHash = true;
        log.writeFile(csvFile, writeErr => {
            if (writeErr) console.error(chalk.red(writeErr));
            waterfallCb(null, csvFile);
        });
    } else {
        csvFile.report.matchingHash = false;
        csvFile.config.hash = hash;
        waterfallCb(null, csvFile);
    }
}

/* updating the log file should live here too!! */

function updateHash(csvFiles, cb) {
    console.log('updateHash called');

    cb();
}


module.exports = {
    checkHash: checkHash,
    updateHash: updateHash,
};
