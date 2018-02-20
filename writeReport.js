/* eslint no-console:1 */

const fs = require('fs');
const fws = require('fixed-width-string');
const moment = require('moment');
const chalk = require('chalk');
const settings = require('./settings.json');


var lineBreak = '\r\n-------------------------------------------------------------------------------------------------------------------------------\r\n';

/***************************************
 * Writes the header of the main report
 ***************************************/
function header(date, cb) {
    console.log('Write Header called');
    var head = `${lineBreak}${fws(date.toDateString(), 20) + date.toTimeString()}${lineBreak}`;


    fs.appendFile(`${settings.logPath}log.txt`, head, writeErr => {
        if (writeErr) {
            cb(writeErr);
            return;
        }
        cb(null);
    });
}

/*******************************************
 * Writes file-specific data to the report
 ******************************************/
function file(csvFile, cb) {
    console.log('Write File called');

    /* remove QualtricsSync- from csvTitle */
    var text = `\r\n${fws(csvFile.config.csv.replace(/^QualtricsSync-/, ''), 30)}`;

    if (csvFile.report.fileError) {
        /* if there was a file-level err */
        text += `\r\n${csvFile.report.fileError}\r\n`;
    } else if (csvFile.report.matchingHash) {
        /* if the hashes matched */
        text += '\r\n\t The hashes matched \r\n';
    } else {
        /* if changes were made */
        text += fws(`Changes to be Made: ${csvFile.report.toAdd.length + csvFile.report.toUpdate.length + csvFile.report.toDelete.length}`, 30);
        text += fws(`Added: ${csvFile.report.toAdd.length}`, 15);
        text += fws(`Updated: ${csvFile.report.toUpdate.length}`, 17);
        text += `${fws(`Deleted: ${csvFile.report.toDelete.length}`, 17)}\r\n`;
        if (csvFile.report.failed.length > 0) {
            /* if specific contacts failed to sync */
            csvFile.report.failed.forEach(function (filedContact) {
                text += `\tFailed to ${filedContact.action} contact: ${filedContact.externalDataReference} ${filedContact.errorMessage}\r\n`;
            });
        }
    }

    /* Append to log */
    fs.appendFile(`${settings.logPath}log.txt`, text, writeErr => {
        if(writeErr) {
            cb(writeErr, csvFile);
            return;
        }
        cb(null, csvFile);
    });
}

/*******************************************
 * Writes a single error to the main report
 *******************************************/
function error(err, cb) {
    console.error(chalk.red(err.stack));
    console.log('Write Error called');

    cb(null);
}

/**************************************
 * Writes the footer to the main report
 * Uses a callback if one is given
 **************************************/
function footer(startTime, cb) {
    var elapsedTime = getElapsedTime(startTime);
    console.log(`Elapsed Time: ${elapsedTime}`);
    console.log('Write Footer called');

    if (cb) cb();
}

/***************************************************************
 * Writes a log using the name of a single csv file containing
 * info on all contacts who were added/deleted/updated 
 **************************************************************/
function detailedFile(csvFile, cb) {
    console.log('Write detailed file called');

    cb(null, csvFile);
}

/* HELPERS */

/**************************************
 * calls error() & footer()
 **************************************/
function fatalError(err, startTime, finalCb) {
    error(err, (writeErr) => {
        if (writeErr) {
            console.error(chalk.red('Error writing fatal error. No attempt to write footer was made.'));
            finalCb(writeErr);
            return;
        }
        footer(startTime, finalCb);
    });
}

/**********************************************
 * Calculates elapsed time. Takes a start time
 **********************************************/
function getElapsedTime(startTime) {
    // THIS FUNCTION NEEDS HELP...
    startTime = moment(startTime);

    var endTime = moment(),
        hours = endTime.diff(startTime, 'hours'),
        minutes = endTime.diff(startTime, 'minutes'),
        seconds = endTime.diff(startTime, 'seconds');



    return `${hours}:${minutes}:${seconds}`;
}


module.exports = {
    writeHeader: header,
    writeFile: file,
    writeErr: error,
    writeFooter: footer,
    writeDetailedFile: detailedFile,
    writeFatalErr: fatalError,
};