/* eslint no-console:0 */

const asyncLib = require('async');
const fs = require('fs');
const d3 = require('d3-dsv');
// const path = require('path');
const chalk = require('chalk');
// const timer = require('repeat-timer');
const settings = require('./settings.json');
const generateReport = require('./generateReport.js');
const hashFunctions = require('./hash.js');
const syncFunctions = require('./sync.js');
const sendEmail = require('./email.js');


var startDate = new Date();


function readCsvFile(csvFile, waterfallCb) {
    /* read the file!! */
    fs.readFile(`${settings.filePath}${csvFile.csv}`, (readErr, fileContents) => {
        if(readErr) {
            waterfallCb(readErr);
            return;
        }
        /* save parsed file to csvFile object */
        csvFile.contacts = d3.csvParse(fileContents.toString());
        waterfallCb(null, csvFile);
    });
}


function runCSV(csvFile, eachCallback) {
    asyncLib.waterfall([
        asyncLib.constant(csvFile),
        readCsvFile,
        hashFunctions,
        ...syncFunctions,
    ],
    (waterfallErr, updatedCsvFile) => {
        if (waterfallErr) {
            /* KILLS ALL csvFILES TO PASS TO CB */
            generateReport.writeErr(waterfallErr, () => {
                eachCallback(null, updatedCsvFile);
            });
            return;
        }
        eachCallback(null, updatedCsvFile);
    });
}


/* loop through each row then generate reports */
function processFiles(csvFiles) {
    /* outermost loop. Returns here when all mailing lists have been processed */
    asyncLib.mapSeries(csvFiles, runCSV, (err, processedCsvFiles) => {
        if (err) {
            generateReport.writeErr(err, writeErr => {
                if (writeErr) {
                    console.error(chalk.red('Unable to write err to log'));
                }
                generateReport.writeFooter(null, writeErr => {
                    if (writeErr) {
                        console.error(chalk.red(writeErr));
                    }
                    sendEmail('Fake Email Message');
                    return;
                });
            });
        }
        // console.log(JSON.stringify(processedCsvFiles, null, 2));
        generateReport.writeFooter();
        console.log(chalk.blue('Done'));
    });
}



/* read config file */
function readConfigFile() {
    fs.readFile(settings.configLocation, (readErr, configData) => {
        if (readErr) {
            /* because it's a fatal error */
            // ADD ERR HANDLING TO CALLBACKS!
            generateReport.writeErr(readErr, () => {
                generateReport.writeFooter(startDate, () => {
                    sendEmail('Fake Email Message');
                    return;
                });
            });
        }
        /* format results into the appropriate format */
        var csvFiles = d3.csvParse(configData.toString())
            .map(file => {
                return {
                    config: file,
                    fileData: {},
                    results: {}
                };
            });

        processFiles(csvFiles);
    });
}


/* 1. generate header */
function start() {
    generateReport.writeHeader(startDate, writeErr => {
        if (writeErr) {
            console.error(chalk.red(writeErr));
        }
        readConfigFile();
    });
}

/* 2. read config file */

/* 3. asyncEachSeries */
/* a. hash file */
/* b. compare hash */
/* c. filter out matching hashes*/
/* add matching hash to report */
/* d. process mailing list logic. Pull, compare, & update */


/****************
 * START HERE
 ****************/
// timer(start);
start();