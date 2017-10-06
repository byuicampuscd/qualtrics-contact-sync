/*eslint-env node, es6*/
/*eslint no-console:0*/
'use-strict';

var lw = function () {},
    proto = lw.prototype;

const settings = require('./settings.json'),
    fs = require('fs'),
    fws = require('fixed-width-string'),
    chalk = require('chalk');

/*******************************
 * returns the number of files that 
 * synced without any errors
 *******************************/
function getFilesSynced(files) {
    var totalFiles = 0;
    files.forEach(function (file) {
        if (file.passed) {
            totalFiles++;
        }
    });
    return totalFiles;
}

/**********************************
 * returns the total number of changes 
 * made successfully
 **********************************/
function getChangesMade(files) {
    var totalChanges = 0;

    files.forEach(function (file) {
        if (file.passed == true) {
            totalChanges += file.aCount;
            totalChanges += file.uCount;
            totalChanges += file.dCount;
        }
    });
    return totalChanges;
}

/***********************************************************
 * write a string to the log with an optional cb
 * MUST by synchronous or the log won't write in the correct order
 **********************************************************/
proto.writeSync = function (string, cb) {
    fs.appendFileSync(settings.logLocation, string);
    if (cb != undefined)
        cb();
}

/***************************************
 * generate the footer as a string
 ***************************************/
proto.generateFooter = function (message, elapsedTime, files) {
    var footer = '\r\n\r\n';
    if (message != undefined) {
        footer += message;
    }
    if (elapsedTime != undefined) {
        footer += fws('Elapsed Time: ' + elapsedTime, 32);
    }
    if (files != undefined) {
        var filesSynced = getFilesSynced(files),
            changesMade = getChangesMade(files);
        footer += fws('Files Successfully Synced: ' + filesSynced, 36);
        footer += 'Total Students Altered: ' + changesMade;
    }

    footer += '\r\n-------------------------------------------------------------------------------------------------------------------------------------\r\n\r\n\r\n\r\n';
    console.log(chalk.green('The log Has been updated'));
    proto.writeSync(footer);
}

/*********************************************************
 * generate the status of an individual csv as a string
 **********************************************************/
proto.generateFile = function (wrapper) {
    // console.log(chalk.yellow('Wrapper Object:\n'), wrapper);
    var text = '',
        file = wrapper.file,
        link = wrapper.link,
        fileName = '';

    // if file was synced
    if (file != false) {
        fileName = file.fileName.replace(/^QualtricsSync-/, '');
        text += '\r\n' + fws(fileName, 30);
        if (file.fileError != undefined) {
            text += '\r\n\t' + file.fileError + '\r\n';
        } else {
            text += fws("Changes to be Made: " + file.toAlterAmount, 30);
            text += fws("Added: " + file.aCount, 15);
            text += fws("Updated: " + file.uCount, 17);
            text += fws("Deleted: " + file.dCount, 17);
            text += '\r\n';
            if (file.studentErrors.length > 0) {
                file.studentErrors.forEach(function (error) {
                    text += '\tFailed to ' + error.action + ' student: ' + error.externalDataReference + ' ' + error.errorMessage + '\r\n';
                });
            }
        }
    } else {
        fileName = link.csv.replace(/^QualtricsSync-/, '');
        text += '\r\n' + fws(fileName, 30);

        if (link.matchingHashes) {
            text += '\r\n\t' + 'The hashes matched' + '\r\n';
        }
    }

    proto.writeSync(text);
}

/***************************************
 * generate the header as a string
 ***************************************/
proto.generateHeader = function (configError) {
    var date = new Date(),
        head = '-------------------------------------------------------------------------------------------------------------------------------------\r\n';
    head += fws(date.toDateString(), 20) + date.toTimeString();
    head += '\r\n-------------------------------------------------------------------------------------------------------------------------------------';
    if (configError !== undefined) {
        head += configError + '\r\n';
    }
    proto.writeSync(head);
}

module.exports = lw;
