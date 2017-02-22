// call linkSnatcher & get all mailing list objects
'use strict';

const fs = require('fs'),
    studentSnatcher = require('./studentSnatcher.js'),
    processMailingList = require('./processMailingList.js'),
    chalk = require('chalk'),
    async = require('async'),
    ss = new studentSnatcher();

// write to log
function writeLog(report) {
    fs.appendFile("lists/log.txt", report, function (err) {
        if (err) throw err;
    });
    console.log(chalk.green("\nUpdated the log"));
}

// create string to send to the log file
function generateReport(err, files) {
    var failCount = 0,
        timeStamp = new Date(),
        report = "\n\n--------------------------------------------------------------------------\n" + timeStamp + "\n--------------------------------------------------------------------------";

    if (files === null) {
        report += "\nUnable to read configuration file\n" + err;
    } else {
        files.forEach(function (file) {
            report += "\n\n-----------------------------------\n" + file.fileName + "\n-----------------------------------";
            //file errors are errors that caused the program to skip the file.
            if (file.fileError !== null) {
                report += "\nFile failed to sync" + "\nError: " + file.fileError;
            } else {
                report += "\nChanges to be made: " + file.toAlterAmount;
                report += "\n\tStudents successfully Added: " + file.aCount;
                report += "\n\tStudents successfully Updated: " + file.uCount;
                report += "\n\tStudents successfully Deleted: " + file.dCount;

                if (file.passed)
                    report += "\n\nFile successfully synced";
                else {
                    report += "\n\nErrors encountered: " + file.failed.length;
                    for (var i = 0; i < file.failed.length; i++) {
                        report += "\n\tFailed to " + file.failed[i].action + " student: " + file.failed[i].externalDataReference + " Error: " + file.failed[i].errorMessage;
                    }
                }
            }
        });
    }
    report += "\n--------------------------------------------------------------------------\n\n\n";
    writeLog(report);
}

function init(err, links) {
    //check for errors while reading config.csv
    if (err) {
        console.log(chalk.red('Unable to read configuration file\n', err));
        generateReport(err, null);
        return;
    }

    //process individual files one at a time
    async.mapLimit(links, 1, processMailingList, function (err, files) {
        generateReport(null, files);
    });
}

ss.readConfig(init);
