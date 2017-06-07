/*eslint-env:node*/
/*eslint no-console:0*/
'use-strict';

var fm = function () {},
    proto = fm.prototype;

const settings = require('./settings.json'),
    logPath = settings.logLocation,
    fs = require('fs'),
    fws = require('fixed-width-string'),
    chalk = require('chalk'),
    sendMail = require('./email.js');


function getFilesSynced(files) {
    var totalFiles = 0;
    files.forEach(function (file) {
        if (file.passed) {
            totalFiles++;
        }
    });
    return totalFiles;
}

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

proto.writeSync = function (string, cb) {
    fs.appendFileSync(logPath, string);
}


proto.write = function (string, cb) {
    fs.appendFile(logPath, string, function (err) {
        if (err) console.error(err);
    });
    if (cb != undefined)
        cb();
}

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

proto.generateFile = function (dataToSync) {
    // console.log(chalk.yellow('Data to sync:\n'), dataToSync);
    var text = '',
        file = dataToSync.file,
        link = dataToSync.link,
        fileName = '';

    // if file was synced
    if (dataToSync.file != false) {
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
                    text += '\tFailed to ' + error.action + ' student: ' + error.externalDataReference + 'Error: ' + error.errorMessage + '\r\n';
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

    proto.write(text);
}

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

module.exports = fm;
