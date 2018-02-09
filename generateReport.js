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

function footer(something, cb) {
    console.log('Write Footer called');
    cb();
}


module.exports = {
    writeHeader: header,
    writeErr: error,
    writeFooter: footer,
    writeFile: file
};