/* eslint no-console:0 */

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



/************************************************************************
 * Hashes a JSON stringified copy of the csvFile & compares it to the 
 * saved hash.
 * Adds csvFile.report.matchingHash & csvFile.report.newHash to csvFile
 ***********************************************************************/
function checkHash(csvFile, waterfallCb) {
    var hash = stringHash(JSON.stringify(csvFile.csvContacts));

    if (csvFile.config.hash == hash) {
        console.log(chalk.green('Hashes Matched'));
        csvFile.report.matchingHash = true;
        log.writeFile(csvFile, () => {
            waterfallCb(null, csvFile);
        });
    } else {
        csvFile.report.matchingHash = false;
        csvFile.report.newHash = hash;
        waterfallCb(null, csvFile);
    }
}

/********************************************************
 * Loops through syncedCsvFiles & writes a new Config
 * file with updated hashes. USES PROMISES
 * Only updates hashes if the csv synced without any errs
 *********************************************************/
function updateHash(syncedCsvFiles) {
    return new Promise((resolve, reject) => {
        var config = syncedCsvFiles.map(csvFile => {
            /* If the hashes didn't match & no errs occurred (file or contact level) */
            if (!csvFile.report.matchingHash && (csvFile.report.failed.length == 0 && csvFile.report.fileError == null)) {
                /* replace old hash with the new hash */
                csvFile.config.hash = csvFile.report.newHash;
            }
            /* Else keep the old hash */
            return csvFile.config;
        });
        config = d3.csvFormat(config);

        fs.writeFile(settings.configFile, config, writeErr => {
            if (writeErr) {
                console.error(chalk.red(writeErr));
                reject(writeErr);
                return;
            }
            console.log(chalk.green('Hashes Updated'));
            resolve(syncedCsvFiles);
        });
    });
}


module.exports = {
    checkHash,
    updateHash
};