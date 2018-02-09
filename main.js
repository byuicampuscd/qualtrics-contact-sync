/* eslint no-console:0 */

const asyncLib = require('async');
const fs = require('fs');
const d3 = require('d3-dsv');
// const path = require('path');
const chalk = require('chalk');
// const timer = require('repeat-timer');
const settings = require('./settings.json');
const log = require('./generateReport.js');
const hash = require('./hash.js');
const syncFunctions = require('./sync.js');
const sendEmail = require('./email.js');


var startTime = new Date();



function onComplete(err, processedCsvFiles) {
    if (err) {
        log.writeFatalErr(err, startTime, writeErr => {
            if (writeErr) console.error(chalk.red(writeErr));
            sendEmail('Fake Email Message');
            return;
        });
    }
    console.log(`CSV files processed: ${processedCsvFiles.length}`);
    // use a waterfall if the list of functions gets any larger than updating hashes & writing the log

    hash.updateHash(processedCsvFiles, writeErr => {
        if (writeErr) console.error(chalk.red(writeErr));
        log.writeFooter(startTime, null);
        console.log(chalk.blue('Done'));
    });
}


function readCsvFile(csvFile, waterfallCb) {
    /* read the file!! */
    fs.readFile(`${settings.filePath}${csvFile.config.csv}`, (readErr, fileContents) => {
        if (readErr) {
            waterfallCb(readErr);
            return;
        }
        /* save parsed file to csvFile object */
        csvFile.contacts = d3.csvParse(fileContents.toString());
        waterfallCb(null, csvFile);
    });
}


function runCSV(csvFile, eachCallback) {
    console.log(chalk.blue(csvFile.config.csv));

    asyncLib.waterfall([
        asyncLib.constant(csvFile),
        readCsvFile,
        hash.checkHash,
        ...syncFunctions,
    ],
    (waterfallErr, updatedCsvFile) => {
        if (waterfallErr) {
            /* KILLS ALL csvFILES IF PASSED TO CB */
            log.writeErr(waterfallErr, () => {
                eachCallback(null, updatedCsvFile);
            });
            return;
        }
        eachCallback(null, updatedCsvFile);
    });
}

/* loop through each row then generate reports */
function loopFiles(csvFiles) {
    /* outermost loop. Returns here when all mailing lists have been processed */
    asyncLib.mapSeries(csvFiles, runCSV, onComplete);
}

/* read config file */
function readConfigFile() {
    fs.readFile(settings.configLocation, (readErr, configData) => {
        if (readErr) {
            /* because it's a fatal error */
            log.writeFatalErr(readErr, startTime, writeErr => {
                if (writeErr) console.error(chalk.red(writeErr));
                sendEmail('Fake Email Message');
                return;
            });
        }
        /* format results into the appropriate format */
        var csvFiles = d3.csvParse(configData.toString())
            .map(file => {
                return {
                    config: file,
                    fileData: {},
                    report: {}
                };
            });

        loopFiles(csvFiles);
    });
}


/* 1. generate header */
function start() {
    log.writeHeader(startTime, writeErr => {
        if (writeErr) console.error(chalk.red(writeErr));
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