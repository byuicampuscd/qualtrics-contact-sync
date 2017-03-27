// call linkSnatcher & get all mailing list objects
'use strict';

const fs = require('fs'),
    d3 = require('d3-dsv'),
    fws = require('fixed-width-string'),
    studentSnatcher = require('./studentSnatcher.js'),
    processMailingList = require('./processMailingList.js'),
    hashManager = require('./hashManager.js'),
    feedbackManager = require('./feedbackManager.js'),
    sendMail = require('./email.js'),
    chalk = require('chalk'),
    async = require('async'),
    fm = new feedbackManager(),
    ss = new studentSnatcher();

const fakeFiles = require('./fakeFiles.js');

// create string to send to the log file
/*function generateReport(err, files, time) {
    var report = "";

    report += "\r\n\r\n-------------------------------------------------------------------------------------------------------------------------------------\r\n" + new Date() + "\r\n-------------------------------------------------------------------------------------------------------------------------------------\r\n";

    if (files === null) {
        report += "\r\n\r\nUnable to read configuration file\r\n" + err;
    } else {
        //declare important var's
        var filesSynced = fws("Files Successfully Synchronized: " + getFilesSynced(files), 39),
            totalChanges = "Total Changes Made: " + getChangesMade(files),
            elapsedTime = fws("Elapsed Time: " + time, 29);

        //add overall stats
        report += elapsedTime + filesSynced + totalChanges;
        files.forEach(function (file) {
            report += "\r\n\r\n";
            report += fws(file.fileName.replace('QualtricsSync-', ''), 30);
            //output file Errors (caused file to be skipped)
            if (file.fileError !== null) {
                report += "\r\nFile Failed to sync" + "\r\nError: " + file.fileError;
            } else { //output file stats
                report += fws("Changes to be Made: " + file.toAlterAmount, 30);
                report += fws("Added: " + file.aCount, 15);
                report += fws("Updated: " + file.uCount, 17);
                report += fws("Deleted: " + file.dCount, 17);
                if (file.passed)
                    report += fws("File successfully synced", 25);
                else { //if there were individual errors
                    report += "\r\nErrors encountered: " + file.studentErrors.length;
                    for (var i = 0; i < file.studentErrors.length; i++) {
                        report += "\r\n\tFailed to " + file.studentErrors[i].action + " student: " + file.studentErrors[i].externalDataReference + " Error: " + file.studentErrors[i].errorMessage;
                    }
                }
            }
        });
    }
    report += "\r\n-------------------------------------------------------------------------------------------------------------------------------------\r\n\r\n\r\n";
    writeLog(report);
}*/

function getElapsedTime(start) {
    var end = new Date();
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

// looks for file level errors
function checkForErrors(files) {
    var studentErrs = "",
        fileErrs = "";

    files.forEach(function (file) {
        if (file.fileError !== null) {
            fileErrs += "\n" + file.fileName + " Failed to sync with the following error:\n" + file.fileError;
        } else if (file.passed != true) {
            studentErrs += "\n\nThe following students from " + file.fileName + " did not sync.";
            file.studentErrors.forEach(function (student) {
                studentErrs += fws("\nStudent: " + student.externalDataReference, 30) + fws(" Action: " + student.action, 17) + " Error: " + student.errorMessage;
            });
        }
    });

    if (fileErrs !== "" || studentErrs !== "") {
        var errs = fileErrs + studentErrs;
        //sendMail(errs);
    } else {
        return;
    }
}

function updateHashes(links, cb) {
    links.forEach(function (link) {
        link.hash = link.newHash;
        delete link.newHash;
    });

    var toWrite = d3.csvFormat(links);
    fs.writeFile("Z:\\debug.csv", toWrite, function (err) {
        if (err) cb(err);
        console.log(chalk.green("New hashes saved!"));
        fm.write('\rHashes have been updated');
        cb();
    });
}

//bridge between hashes and syncing
function syncInit(err, links) {
    var elapsedTime = getElapsedTime(startTime);
    if (err) {
        err = "There was a fatal error while comparing files via hash\n" + err;
        console.log(chalk.red(err));
        fm.write(err, fm.generateFooter('called at syncInit', elapedTime));
        //sendMail(err);
        return;
    }

    if (links.length <= 0) {
        console.log(chalk.green('All hashes matched'));
        fm.generateFooter('All hashes matched', elapsedTime);
        return;
    }

    //process individual files one at a time
    async.mapLimit(links, 1, processMailingList, function (err, files) {
        files = fakeFiles;
        //console.log('LINKS:\n', links);
        //console.log("FILES:\n", files);

        //UPDATE HASHES
        updateHashes(links, function (err) {
            if (err) {
                console.error(err);
            }
            var elapsedTime = getElapsedTime(startTime);
            console.log("\nElapsed Time:", elapsedTime);
            fm.generateFooter(null, elapsedTime, files);
        });
    });
}

// reads config file and starts the hash comparison
function init(err, links) {
    fm.generateHeader();

    //check for errors while reading config.csv
    if (err) {
        err = 'Unable to read configuration file\n' + err;
        console.log(chalk.red(err));
        var elapsedTime = getElapsedTime(startTime);
        fm.write(err, fm.generateFooter("called cli init()", elapsedTime));
        //sendMail(err);
        return;
    }

    hashManager(links, syncInit);
}

var startTime = new Date();
console.log("Started at:", startTime);
ss.readConfig(init);
