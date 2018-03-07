/* eslint no-console:0 */

const asyncLib = require('async');
const fs = require('fs');
const d3 = require('d3-dsv');
const chalk = require('chalk');
const timer = require('repeat-timer');
const settings = require('./settings.json');
const log = require('./writeReport.js');
const hash = require('./hash.js');
const syncFunctions = require('./sync.js');
const sendEmail = require('./email.js');


var startTime;
// var emailSent = false;
var emailSent = true; // TESTING set to true to disable emails
// TODO email sent needs to be reset when the run starts

/***************************************************
 * Looks for file level and contact level errs
 * in each csvFile. Sends an email if ANY are found
 ***************************************************/
function checkForErrs(syncedCsvFiles) {
    var errFound = syncedCsvFiles.some(csvFile => {
        return csvFile.report.failed.length > 0 || csvFile.report.fileError;
    });

    if (errFound && !emailSent) {
        emailSent = true;
        sendEmail();
    }
}

/********************************************
 * Runs when all csv files have been synced.
 * Updates hashes, finishes the log file, &
 * sends an email if needed.
 *******************************************/
function onComplete(err, syncedCsvFiles) {
    if (err) {
        log.writeFatalErr(err, startTime, syncedCsvFiles, () => {
            if (!emailSent) sendEmail();
            return;
        });
    }
    console.log(`\n\nCSV files processed: ${syncedCsvFiles.length}`);

    // TODO do we still need promises?
    
    // hash.updateHash(syncedCsvFiles)
    Promise.resolve(syncedCsvFiles) // TESTING USE WHEN UPDATING HASH IS DISABLED
        .catch((err, syncedCsvFiles) => {
            console.error(chalk.red(err.stack));
            if (!sendEmail) sendEmail();
            Promise.resolve(syncedCsvFiles);
        })
        .then((syncedCsvFiles) => {
            /* write the footer */
            return new Promise((resolve) => {
                log.writeFooter(startTime, syncedCsvFiles, resolve(syncedCsvFiles));
            });
        })
        .then((csvFiles) => {
            if (!emailSent) {
                checkForErrs(csvFiles);
            }
            console.log(chalk.blue('Done'));
        });
}

/************************************************
 * Reads a csvFile. Removes zero width no break 
 * space character where present. This character 
 * is frequently found in the csv's
 ************************************************/
function readCsvFile(csvFile, waterfallCb) {
    fs.readFile(`${settings.filePath}${csvFile.config.csv}`, (readErr, fileContents) => {
        if (readErr) {
            /* for some reason there is no stack when fs returns the Err */
            Error.captureStackTrace(readErr); // TODO was this not working because of chalk
            waterfallCb(readErr, csvFile);
            return;
        }
        /* remove zero width no break space from csv (especially the beginning) */
        var invisibleSpace = new RegExp(String.fromCharCode(65279), 'g');
        fileContents = fileContents.toString().replace(invisibleSpace, '');
        /* Excel turns True to TRUE, which will make the contact update */
        fileContents.replace(/TRUE/g, 'True').replace(/FALSE/g, 'False'); // TODO move this to formatCSV

        /* save parsed file to csvFile object */
        csvFile.csvContacts = csvFile.csvContacts.concat(d3.csvParse(fileContents));

        waterfallCb(null, csvFile);
    });
}

/*********************************************
 * Runs all actions on a single mailing list.
 ********************************************/
function runCSV(csvFile, eachCallback) {
    console.log(chalk.blue(`\n${csvFile.config.csv}`));

    asyncLib.waterfall([
        asyncLib.constant(csvFile), // pass csvFile into the first function
        readCsvFile, // read the csvFile
        hash.checkHash, // compare hashes
        ...syncFunctions, // sync contacts if hashes didn't match
    ],
    (waterfallErr, updatedCsvFile) => {
        if (waterfallErr) {
            /* Kills all csvFiles if passed to cb */
            /* save err to file csvFile obj for reporting  */
            updatedCsvFile.report.fileError = waterfallErr;
            console.error(chalk.red(waterfallErr.stack));
        }
        // TODO check for the matching hash here. If they matched move on & if not call sync
        /* write reports! Both functions handle their own errs */
        log.writeFile(updatedCsvFile, () => {
            log.writeDetailedFile(updatedCsvFile, startTime, () => {
                eachCallback(null, updatedCsvFile);
            });
        });
    });
}

/***********************************************
 * loop through each csv on the config file
 **********************************************/
function loopFiles(csvFiles) {
    /* outermost loop. Returns to onComplete when all
     mailing lists have been processed */
    asyncLib.mapSeries(csvFiles, runCSV, onComplete);
}

/*****************************************************
 * Read & parse config file (create csvFiles object)
 * Config file path determined by settings.json
 ***************************************************/
function readConfigFile() {
    fs.readFile(settings.configFile, (readErr, configData) => {
        if (readErr) {
            console.error(chalk.red(readErr.stack));
            log.writeFatalErr(readErr, startTime, null, () => {
                if (!emailSent) sendEmail();
                return;
            });
            return;
        }
        /* format results into the appropriate format */
        var csvFiles = d3.csvParse(configData.toString(), (file) => {
            return {
                config: file,
                csvContacts: [],
                qualtricsContacts: [],
                report: {
                    toAdd: [],
                    toUpdate: [],
                    toDelete: [],
                    failed: [],
                    fileError: null
                }
            };
        });

        loopFiles(csvFiles);
    });
}

/********************************
 * Generate header on log file
 * call readConfigFile
 *******************************/
function start() {
    startTime = new Date();
    log.writeHeader(startTime, () => {
        readConfigFile();
    });
}

/****************
 * START HERE
 ****************/
// timer(start);
start(); // TESTING