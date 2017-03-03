// call linkSnatcher & get all mailing list objects
'use strict';

const fs = require('fs'),
    fws = require('fixed-width-string'),
    studentSnatcher = require('./studentSnatcher.js'),
    processMailingList = require('./processMailingList.js'),
    sendMail = require('./email.js'),
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
        totalChanges += file.uCount;
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
    var report = "";

    report += "\n\n-------------------------------------------------------------------------------------------------------------------------------\n" + new Date() + "\n-------------------------------------------------------------------------------------------------------------------------------\n";

    if (files === null) {
        report += "\n\nUnable to read configuration file\n" + err;
    } else {
        //declare important var's
        var filesSynced = fws("Files Synchronized: " + getFilesSynced(files), 26),
            totalChanges = "Total Changes Made: " + getChangesMade(files),
            elapsedTime = fws("Elapsed Time: " + time, 29);

        //add overall stats
        report += elapsedTime + filesSynced + totalChanges;
        files.forEach(function (file) {
            report += "\n\n";
            report += fws(file.fileName.replace('QualtricsSync-', ''), 29);
            //output file Errors (caused file to be skipped)
            if (file.fileError !== null) {
                report += "\nFile failed to sync" + "\nError: " + file.fileError;
            } else { //output file stats
                report += fws("Changes found: " + file.toAlterAmount, 24);
                report += fws("Added: " + file.aCount, 15);
                report += fws("Updated: " + file.uCount, 17);
                report += fws("Deleted: " + file.dCount, 17);
                if (file.passed)
                    report += fws("File successfully synced", 25);
                else { //if there were individual errors
                    report += "\nErrors encountered: " + file.failed.length;
                    for (var i = 0; i < file.failed.length; i++) {
                        report += "\n\tFailed to " + file.failed[i].action + " student: " + file.failed[i].externalDataReference + " Error: " + file.failed[i].errorMessage;
                    }
                }
            }
        });
    }
    report += "\n-------------------------------------------------------------------------------------------------------------------------------\n\n\n";
    writeLog(report);
}

function getElapsedTime(start, end) {
    //create elapsed time
    var seconds = (end - start) / 1000,
        minutes = 0,
        hours = 0,
        elapsedTime = "";
    //calculate minutes
    if (seconds >= 60) {
        minutes = Math.floor(seconds / 60);
        seconds = Math.floor(seconds % 60);
    }
    //format seconds
    if (seconds < 10)
        seconds = '0' + seconds;
    //calculate hours
    if (minutes >= 60) {
        hours = Math.floor(minutes / 60);
        minutes = Math.floor(minutes % 60);
    }
    //format minutes
    if (minutes < 10)
        minutes = '0' + minutes;
    //format hours
    if (hours < 10)
        hours = '0' + hours;

    elapsedTime += hours + ":" + minutes + ":" + seconds;
    return elapsedTime;
}

//WIP!!!
function checkForErrors(files) {
    var errs = "";

    files.forEach(function (file) {
        if (file.fileError !== null) {
            errs += "\n" + file.fileName + " failed to sync with the following error:\n" + file.fileError;
            //            console.log('The email message:\n', errs);
            sendMail(errs);
        } else if (file.passed != true) {
            errs += "the following erros were found in: " + file.fileName;
            file.failed.forEach(function (student) {
                errs += "\nFailed to " + student.action + " student: " + student.externalDataReference + " Error: " + student.errorMessage;
            });
            //            console.log('The email message:\n', errs);
            sendMail(errs);
        } else {
            return;
        }
    });
}

function init(err, links) {
    //check for errors while reading config.csv
    if (err) {
        err = 'Unable to read configuration file\n' + err;
        sendMail(err);
        console.log(chalk.red(err));
        generateReport(err, null);
        return;
    }

    var start = new Date();

    //on file error:
    /*{ fileName: 'QualtricsSync-Clear.csv',
  fileError: 'A fake Error was found' }*/




    //process individual files one at a time
    async.mapLimit(links, 1, processMailingList, function (err, files) {
        //        console.log(files[0]);
        var end = new Date(),
            elapsedTime = getElapsedTime(start, end);

        //check if row level errors exist
        checkForErrors(files);
        // if yes, get a list of them and send them to email with sendMail(message)

        console.log("\nElapsed Time:", elapsedTime);
        generateReport(null, files, elapsedTime);
    });
}

console.log("Started at:", new Date());
ss.readConfig(init);
