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
    console.log(chalk.green("\nThe log has been updated"));
}

function getChangesMade(files) {
    var totalChanges = 0;
    if (!files)
        return totalChanges;

    files.forEach(function (file) {
        totalChanges += file.aCount;
        totalChanges += file.dCount;
        totalChanges += file.dCount;
    });
    return totalChanges;
}

function getFilesSynced(files) {
    var totalFiles = 0;
    files.forEach(function (file) {
        if (file.passed) {
            totalFiles++;
        }
    });
    return totalFiles;
}

// create string to send to the log file
function generateReport(err, files, time) {
    var failCount = 0,
        filesSynced = getFilesSynced(files),
        totalChanges = getChangesMade(files),
        report = "\n\n--------------------------------------------------------------------------\n" + new Date() + "\n--------------------------------------------------------------------------";
    //add overall stats
    report += "\nElapsed Time: " + time + "\nFiles Synchronized: " + filesSynced + "\nTotal Changes Made: " + totalChanges;
    if (files === null) {
        report += "\nUnable to read configuration file\n" + err;
    } else {
        files.forEach(function (file) {
            report += "\n\n------------------------------------------\n" + file.fileName + "\n------------------------------------------";
            //output file Errors (caused file to be skipped)
            if (file.fileError !== null) {
                report += "\nFile failed to sync" + "\nError: " + file.fileError;
            } else { //output file stats
                report += "\nChanges to be made: " + file.toAlterAmount;
                if (file.toAlterAmount > 0) {
                    report += "\n\tStudents successfully Added: " + file.aCount;
                    report += "\n\tStudents successfully Updated: " + file.uCount;
                    report += "\n\tStudents successfully Deleted: " + file.dCount;
                }
                if (file.passed)
                    report += "\n\nFile successfully synced";
                else { //if there were individual errors
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

function getElapsedTime(start, end) {
    //create elapsed time
    var seconds = (end - start) / 1000,
        minutes = '00',
        hours = "00",
        elapsedTime = "";
    //calculate minutes
    if (seconds >= 60) {
        minutes = Math.floor(seconds / 60);
        seconds = Math.floor(seconds % 60);;
    }
    //calculate hours
    if (minutes >= 60) {
        hours = Math.floor(minutes / 60);
        minutes = Math.floor(minutes % 60);
    }
    elapsedTime += hours + ":" + minutes + ":" + seconds;
    return elapsedTime;
}


function init(err, links) {
    //check for errors while reading config.csv
    if (err) {
        console.log(chalk.red('Unable to read configuration file\n', err));
        generateReport(err, null);
        return;
    }
    var start = new Date();

    //process individual files one at a time
    async.mapLimit(links, 1, processMailingList, function (err, files) {
        var end = new Date(),
            elapsedTime = getElapsedTime(start, end);

        console.log("\nElapsed Time:", elapsedTime);

        generateReport(null, files, elapsedTime);
    });
}

console.log("Started at:", new Date());
ss.readConfig(init);
