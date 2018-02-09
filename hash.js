/* description here! */

const stringHash = require('string-hash');
// const generateReport = require('./generateReport.js');

module.exports = (csvFile, waterfallCb) => {
    var hash = stringHash(JSON.stringify(csvFile.contacts));


    if (csvFile.config.hash === hash) {
        csvFile.report.matchingHash = true;
        console.log('i need to write to the report here!');
    } else {
        csvFile.report.matchingHash = false;
        csvFile.config.hash = hash;
    }
    waterfallCb(null, csvFile);
};

/* module.exports = [
    createHash,
    compareHash,
]; */