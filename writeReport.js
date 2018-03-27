/* eslint no-console:0 */

const fs = require('fs');
const fws = require('fixed-width-string');
const chalk = require('chalk');
const settings = require('./settings.json');


const lineBreak = '\r\n-------------------------------------------------------------------------------------------------------------------------------\r\n';
const logPath = `${settings.logPath}log.txt`;
/***************************************
 * Writes the header of the main report
 ***************************************/
function header(date, cb) {
    var head = `${lineBreak}${fws(date.toDateString(), 20) + date.toTimeString()}${lineBreak}`;

    fs.appendFile(logPath, head, writeErr => {
        if (writeErr) {
            fsErr(writeErr);
        }
        cb();
    });
}

/*******************************************
 * Writes file-specific data to the report
 * DOES NOT pass errs to the cb
 ******************************************/
function file(csvFile, cb) {
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
                text += `\tFailed to ${filedContact.action} contact: ${filedContact.externalDataReference} ${filedContact.err}\r\n`;
            });
        }
    }

    /* Append to log */
    fs.appendFile(logPath, text, writeErr => {
        if (writeErr) {
            fsErr(writeErr);
        }
        cb(csvFile);
    });
}

/********************************************************
 * Writes a single error to the main report.
 * DOES NOT handle errors that occur while syncing a csv
 ********************************************************/
function error(err, cb) {
    fs.appendFile(logPath, err, writeErr => {
        if (writeErr) {
            fsErr(writeErr);
        }
        cb();
    });
}

/**************************************
 * Writes the footer to the main report
 * Uses a callback if one is given
 **************************************/
function footer(startTime, csvFiles, cb) {
    var elapsedTime = getElapsedTime(startTime),
        footer = '\r\n\r\n';

    footer += fws(`Elapsed Time: ${elapsedTime}`, 32);
    /* add number of files altered if csvFiles is passed in */
    if (csvFiles) {
        footer += fws(`Files Successfully Synced: ${getFilesSynced(csvFiles)}`, 36);
    }
    footer += `${lineBreak}\n\r\n\r`;

    fs.appendFile(logPath, footer, writeErr => {
        if (writeErr) {
            fsErr(writeErr);
        }
        
        console.log(`Elapsed Time: ${elapsedTime}`);
        
        if (cb) {
            cb();
        }
    });
}

/***************************************************************
 * Writes a log using the name of a single csv file containing
 * info on all contacts who were added/deleted/updated
 * DOES NOT pass errs to the callback
 **************************************************************/
function detailedFile(csvFile, date, cb) {
    var text = `${lineBreak}${fws(date.toDateString(), 20) + date.toTimeString()}${lineBreak}`;

    /* Add uniqueID of contact to be added */
    text += `To Add(${csvFile.report.toAdd.length}):\r\n`;
    csvFile.report.toAdd.forEach(contact => {
        // text += `\tContactID: ${contact.externalDataReference}\r\n`;
        text += `\tContactID: ${contact.externalDataRef}\r\n`;
    });
    text += '\r\n';

    /* Add specific key that was different */
    text += `To Update(${csvFile.report.toUpdate.length}):\r\n`;
    csvFile.report.contactDiffs.forEach(diff => {
        text += `\tContactID: ${diff.externalDataReference}\r\n\t\t${diff.contact1}\r\n\t\t${diff.contact2}\r\n\r\n`;
    });
    text += '\r\n';
    
    /* Add contact with uniqueID & qualtricsID */
    text += `To Delete(${csvFile.report.toDelete.length}):\r\n`;
    csvFile.report.toDelete.forEach(contact => {
        text += `\tContactID: ${contact.externalDataReference}\tQualtricsID: ${contact.id}\r\n`;
    });
    text += '\r\n';
    
    text += `Failed(${csvFile.report.failed.length}):\r\n${JSON.stringify(csvFile.report.failed, null, 3)}`;
    text += lineBreak;

    var fileName = `${settings.logPath}${csvFile.config.csv.replace('.csv', '.txt')}`;
    fs.appendFile(fileName, text, writeErr => {
        if (writeErr) {
            fsErr(writeErr);
        }
        cb(csvFile);
    });
}

/* HELPERS */

/**************************************
 * calls error() & footer()
 **************************************/
function fatalError(err, startTime, csvFiles, finalCb) {
    error(err, (writeErr) => {
        if (writeErr) {
            fsErr(new Error ('Error writing fatal error. No attempt to write footer was made.'));
            finalCb(writeErr);
            return;
        }
        footer(startTime, csvFiles, finalCb);
    });
}

/**********************************************
 * Calculates elapsed time. Takes a start time
 **********************************************/
function getElapsedTime(startTime) {
    var end = new Date();
    /* create elapsed time */
    var seconds = (end - startTime) / 1000,
        minutes = 0,
        hours = 0,
        elapsedTime = '';
    /* calculate minutes */
    if (seconds >= 60) {
        minutes = Math.floor(seconds / 60);
        seconds = Math.floor(seconds % 60);
    }
    /* format seconds */
    if (seconds < 10)
        seconds = '0' + seconds;
    /* calculate hours */
    if (minutes >= 60) {
        hours = Math.floor(minutes / 60);
        minutes = Math.floor(minutes % 60);
    }
    /* format minutes */
    if (minutes < 10)
        minutes = '0' + minutes;
    /* format hours */
    if (hours < 10)
        hours = '0' + hours;

    elapsedTime += hours + ':' + minutes + ':' + seconds;
    return elapsedTime;
}

/***********************************
 * returns the number of files that 
 * synced without any errors
 ***********************************/
function getFilesSynced(csvFiles) {
    var totalFiles = 0;
    csvFiles.forEach(function (csvFile) {
        if (!csvFile.report.fileError) {
            totalFiles++;
        }
    });
    return totalFiles;
}

/*************************************************
 * Handles any errs that may occur in this module
 *************************************************/
function fsErr(err) {
    console.error(chalk.red(err.stack));
}

module.exports = {
    writeHeader: header,
    writeFile: file,
    writeErr: error,
    writeFooter: footer,
    writeDetailedFile: detailedFile,
    writeFatalErr: fatalError,
};