/* eslint no-console:1 */

// const fs = require('fs');
// const fws = require('fixed-width-string);
const chalk = require('chalk');

function error(err, cb) {
    console.error(chalk.red(err));
    console.log('Write Error called');

    cb(null);
}

function header(date, cb) {
    console.log('Write Header called');
    cb(null);
}

function file() {
    console.log('Write File called');
}

function footer(elapsedTime, cb) {
    console.log('Write Footer called');
    
    if(cb) cb();
}


/* HELPERS */

function fatalError(err, elapsedTime, finalCb) {
    error(err, (writeErr) => {
        if(writeErr) {
            console.error(chalk.red('Error writing fatal error. No attempt to write footer was made.'));
            finalCb(writeErr);
            return;
        }
        footer(elapsedTime, finalCb);
    });
}

module.exports = {
    writeFatalErr: fatalError,
    writeHeader: header,
    writeErr: error,
    writeFooter: footer,
    writeFile: file
};