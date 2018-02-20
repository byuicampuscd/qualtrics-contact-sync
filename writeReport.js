/* eslint no-console:1 */

// const fs = require('fs');
// const fws = require('fixed-width-string);
const moment = require('moment');
const chalk = require('chalk');


/***************************************
 * Writes the header of the main report
 ***************************************/
function header(date, cb) {
    console.log('Write Header called');
    cb(null);
}

/*******************************************
 * Writes file-specific data to the report
 ******************************************/
function file(csvFile, cb) {
    console.log('Write File called');
    
    cb(null, csvFile);
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
 **************************************/
function footer(startTime, cb) {
    var elapsedTime = getElapsedTime(startTime);
    console.log(`Elapsed Time: ${elapsedTime}`);
    console.log('Write Footer called');

    if(cb) cb();
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
        if(writeErr) {
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
    writeDetailedFile : detailedFile,
    writeFatalErr: fatalError,
};