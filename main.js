/* eslint no-console:0 */

const asyncLib = require('async');
const fs = require('fs');
const d3 = require('d3-dsv');
const chalk = require('chalk');
const timer = require('repeat-timer');
const settings = require('./settings.json');
const log = require('./writeReport.js');
const hash = require('./hash.js');
const syncCsv = require('./sync.js');
const email = require('./email.js');


var startTime;
var emailSent;


function sendEmail() {
    if (emailSent) {
        return;
    } else {
        emailSent = true;
        email();
    }
}


/***************************************************
 * Looks for file level and contact level errs
 * in each csvFile. Sends an email if ANY are found
 ***************************************************/
function checkForErrs(syncedCsvFiles) {
    var errFound = syncedCsvFiles.some(csvFile => {
        return csvFile.report.failed.length > 0 || csvFile.report.fileError;
    });

    if (errFound) sendEmail();
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

    // TODO remove promises
    // hash.updateHash(syncedCsvFiles, (hashErr, syncedCsvFiles) => {
    //     if (hashErr) {
    //         console.error(chalk.red(hashErr.stack));
    //         sendEmail();
    //         return;
    //     }
    //     log.writeFooter(startTime, syncedCsvFiles, syncedCsvFiles => {
    //         checkForErrs(syncedCsvFiles);
    //         console.log(chalk.blue('Done'));
    //     });
    // });


    // Promise.resolve(syncedCsvFiles) // TESTING USE WHEN UPDATING HASH IS DISABLED
    hash.updateHash(syncedCsvFiles)
        .catch((err, syncedCsvFiles) => {
            console.error(chalk.red(err.stack));
            sendEmail();
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
            /* for some reason there is no stack when fs returns the Err. 
             * It is not related to how I display the error */
            Error.captureStackTrace(readErr);
            waterfallCb(readErr, csvFile);
            return;
        }

        /**** CLEAN CSV STRING ****/

        /* remove zero width no break space from csv (especially the beginning) */
        var invisibleSpace = new RegExp(String.fromCharCode(65279), 'g');
        fileContents = fileContents.toString().replace(invisibleSpace, '');

        /* save parsed file to csvFile object */
        csvFile.csvContacts = csvFile.csvContacts.concat(d3.csvParse(fileContents, contact => {
            /* filter out completely empty rows */
            if (!Object.values(contact).every(value => {
                return value === undefined || value === '';
            })) return contact;
            // if (!isEmpty) return contact;
        }));

        waterfallCb(null, csvFile);
    });
}

/************************************************
 * writes file data to log and adds to detailed
 * csv specific log file
 ***********************************************/
function logCsvFile(updatedCsvFile, eachCallback) {
    /* write reports! Both functions handle their own errs */
    log.writeFile(updatedCsvFile, () => {
        log.writeDetailedFile(updatedCsvFile, startTime, () => {
            eachCallback(null, updatedCsvFile);
        });
    });
}


/*********************************************
 * Runs all actions on a single mailing list.
 ********************************************/
function runCSV(csvFile, eachCallback) {
    console.log(chalk.blue(`\n${csvFile.config.csv}`));

    /* in case the config file was missing required fields */
    if (csvFile.report.fileError) {
        console.error(chalk.red(csvFile.report.fileError.stack));
        logCsvFile(csvFile, eachCallback);
        return;
    }

    asyncLib.waterfall([
        asyncLib.constant(csvFile), // pass csvFile into the first function
        readCsvFile, // read the csvFile
        hash.checkHash, // compare hashes
    ],
    (waterfallErr, updatedCsvFile) => {
        if (waterfallErr) {
            /* Kills all csvFiles if passed to cb */
            /* save err to file csvFile obj for reporting  */
            updatedCsvFile.report.fileError = waterfallErr;
            console.error(chalk.red(waterfallErr.stack));
        }

        /* Sync the file if the hash matched, log the file if it didn't */
        if (updatedCsvFile.report.matchingHash === false) {
            syncCsv(updatedCsvFile, (err, updatedCsvFile) => {
                if (err) {
                    updatedCsvFile.report.fileError = err;
                    console.error(chalk.red(err.stack));
                }
                logCsvFile(updatedCsvFile, eachCallback);
            });
        } else {
            logCsvFile(updatedCsvFile, eachCallback);
        }
    });
}

/*************************************************
 * Ensures the config file has all required fields
 * (everything except for hash & LibraryID)
 *************************************************/
function validateConfigFile(csvFiles) {
    const optionalConfigKeys = ['hash', 'LibraryID'];
    var mailingListIDs = csvFiles.map(csvFile => csvFile.config.MailingListID);
    var uniqueMLIDs = csvFiles.every(csvFile => mailingListIDs.indexOf(csvFile.config.MailingListID) === mailingListIDs.lastIndexOf(csvFile.config.MailingListID));

    // TESTING
    if (!uniqueMLIDs) {
        var validationErr = new Error('Duplicate Mailing List ID\'s found');
        console.error(chalk.red(validationErr.stack));
        log.writeFatalErr(validationErr, startTime, csvFiles, sendEmail);
        return;
    }


    csvFiles.forEach(csvFile => {
        var keys = Object.keys(csvFile.config).filter(key => {
            return !optionalConfigKeys.includes(key);
        });

        /* are all required fields present? */
        var isValid = keys.every(configKey => {
            return csvFile.config[configKey] != '' && csvFile.config[configKey] != undefined;
        });

        if (!isValid) {
            csvFile.report.fileError = new Error('Config file missing required field');
        }
    });

    /* loop through each csv on the config file */
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
                sendEmail();
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
                    contactDiffs: [],
                    toAdd: [],
                    toUpdate: [],
                    toDelete: [],
                    failed: [],
                    fileError: null
                }
            };
        });

        validateConfigFile(csvFiles);
    });
}

/********************************
 * Generate header on log file
 * call readConfigFile
 *******************************/
function start() {
    emailSent = false; // TESTING set to true to disable emails
    startTime = new Date();
    console.log(`\nStarted on: ${startTime.toDateString()}`);
    log.writeHeader(startTime, () => {
        readConfigFile();
    });
}

/****************
 * START HERE
 ****************/
timer(start);
// start(); // TESTING