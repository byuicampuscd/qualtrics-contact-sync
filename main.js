/* eslint no-console:0 */

const asyncLib = require('async');
const fs = require('fs');
const d3 = require('d3-dsv');
// const path = require('path');
const chalk = require('chalk');
// const timer = require('repeat-timer');
const settings = require('./settings.json');
const log = require('./writeReport.js');
const hash = require('./hash.js');
const syncFunctions = require('./sync.js');
const sendEmail = require('./email.js');


var startTime = new Date();


/********************************************
 * Runs when all csv files have been synced.
 * Updates hashes, finishes the log file, &
 * sends an email if needed.
 *******************************************/
function onComplete(err, processedCsvFiles) {
    if (err) {
        log.writeFatalErr(err, startTime, processedCsvFiles, writeErr => {
            if (writeErr) console.error(chalk.red(writeErr));
            sendEmail('Fake Email Message');
            return;
        });
    }
    console.log(`\n\nCSV files processed: ${processedCsvFiles.length}`);
    // use a waterfall if the list of functions gets any larger than updating hashes & writing the log

    // things to do:
    // update hash
    // updateLog (main)
    // update log (detailed) - at the end of sync???
    // send email if needed

    // hash.updateHash(processedCsvFiles, writeErr => {
    // if (writeErr) console.error(chalk.red(writeErr));
    console.log(chalk.green('Hashes Updated'));
    log.writeFooter(startTime, processedCsvFiles, null);
    console.log(chalk.blue('Done'));
    // });
}

/************************************************
 * Reads a csvFile. Removes zero width no break 
 * space character where present. This character 
 * is frequently found in the csv's
 ************************************************/
function readCsvFile(csvFile, waterfallCb) {
    fs.readFile(`${settings.filePath}${csvFile.config.csv}`, (readErr, fileContents) => {
        if (readErr) {
            /* for some reason there is no stack wneh fs returns the Err */
            Error.captureStackTrace(readErr);
            waterfallCb(readErr, csvFile);
            return;
        }
        /* remove zero width no break space from csv (especially the beginning) */
        var invisibleSpace = new RegExp(String.fromCharCode(65279), 'g');
        fileContents = fileContents.toString().replace(invisibleSpace, '');

        /* save parsed file to csvFile object */
        csvFile.csvContacts = csvFile.csvContacts.concat(d3.csvParse(fileContents));

        waterfallCb(null, csvFile);
    });
}

/*********************************************
 * Runs all actions on a single mailing list.
 ********************************************/
function runCSV(csvFile, eachCallback) {
    console.log(chalk.blue(csvFile.config.csv));

    asyncLib.waterfall([
        asyncLib.constant(csvFile), // pass csvFile into the first function
        readCsvFile, // read the csvFile
        hash.checkHash, // compare hashes
        ...syncFunctions, // sync contacts if hashes didn't match
        log.writeFile, // write the results of a single file to the log -> MUST RUN EVEN IF WATERFALL FAILES (hence writeFile in waterfallCb)
        log.writeDetailedFile // write the specific changes made to a file
    ],
    (waterfallErr, updatedCsvFile) => {
        if (waterfallErr) {
            /* Kills all csvFiles if passed to cb */
            /* save err to file csvFile obj for reporting  */
            updatedCsvFile.report.fileError = waterfallErr;
            console.error(chalk.red(waterfallErr));

            /* call writeFile to record file level errs 
            (writeFile & writeDetailedFile don't pass errs to the cb so that this line isn't called if the waterfall ended on writing logs) */
            log.writeFile(csvFile, () => {
                eachCallback(null, updatedCsvFile);
            });
            return;
        }
        eachCallback(null, updatedCsvFile);
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
            console.error(chalk.red(readErr));
            log.writeFatalErr(readErr, startTime, null, writeErr => {
                if (writeErr) console.error(chalk.red(writeErr));
                sendEmail('Fake Email Message');
                return;
            });
            return;
        }
        /* format results into the appropriate format */
        var csvFiles = d3.csvParse(configData.toString())
            .map(file => {
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
    log.writeHeader(startTime, writeErr => {
        if (writeErr) console.error(chalk.red(writeErr));
        readConfigFile();
    });
}

/****************
 * START HERE
 ****************/
// timer(start);
start();