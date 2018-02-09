/* eslint no-console:1 */
/* description here! */

const stringHash = require('string-hash');
const log = require('./generateReport.js');
const chalk = require('chalk');

module.exports = (csvFile, waterfallCb) => {
    var hash = stringHash(JSON.stringify(csvFile.contacts));


    if (csvFile.config.hash === hash) {
        csvFile.report.matchingHash = true;
        log.writeFile(csvFile, writeErr => {
            if(writeErr) console.error(chalk.red(writeErr));
            waterfallCb(null, csvFile);
        });
    } else {
        csvFile.report.matchingHash = false;
        csvFile.config.hash = hash;
        waterfallCb(null, csvFile);
    }
};