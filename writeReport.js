/* eslint no-console:1 */

// const fs = require('fs');
// const fws = require('fixed-width-string);
const moment = require('moment');
const chalk = require('chalk');

function error(err, cb) {
    console.error(chalk.red(err.stack));
    console.log('Write Error called');

    cb(null);
}

function header(date, cb) {
    console.log('Write Header called');
    cb(null);
}

function file(csvFile, cb) {
    console.log('Write File called');
    
    cb(null);
}

function footer(startTime, cb) {
    var elapsedTime = getElapsedTime(startTime);
    console.log(`Elapsed Time: ${elapsedTime}`);
    console.log('Write Footer called');

    if(cb) cb();
}


/* HELPERS */

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
    writeFatalErr: fatalError,
    writeHeader: header,
    writeErr: error,
    writeFooter: footer,
    writeFile: file
};