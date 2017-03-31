// call linkSnatcher & get all mailing list objects
'use strict';

const configPath = 'Z:\\debug.csv',
    fs = require('fs'),
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

function checkForErrors(results) {
    var errsExist = false;
    results.forEach(function (result) {
        if (result.file.passed === false || result.file.fileError !== undefined)
            errsExist = true;
    });
    console.log(chalk.magenta(errsExist));
    if (errsExist) {
        console.log(chalk.magenta('poop'));
        sendMail('There was an error with the Qualtrics Sync Tool. Please refer to the log for more detail');
    }
}

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

function updateHashes(results, cb) {
    var toUpdate = [],
        tempLink = {};

    console.log('\n\nresults\n\n', results);

    try {
        var passed = 0,
            failed = 0;
        toUpdate = results.map(function (result) {
            tempLink = {};

            tempLink.csv = result.link.csv;
            tempLink.MailingListID = result.link.MailingListID;
            tempLink.LibraryID = result.link.LibraryID;

            if (result.file.passed === true) {
                tempLink.hash = result.link.newHash;
                passed++;
            } else {
                tempLink.hash = result.link.hash;
                failed++;
            }

            return tempLink;
        });
    } catch (err) {
        cb(err);
        return;
    }

    if (passed == toUpdate.length || failed == toUpdate.length) {
        cb();
        return;
    }

    //states it's gonna change hashes even if none of the files passed
    console.log(chalk.yellow('About to save the hashes!'));
    var toWrite = d3.csvFormat(toUpdate);
    fs.writeFile(configPath, toWrite, function (err) {
        if (err) cb(err);
        else {
            console.log(chalk.green("New hashes saved!"));
            fm.write('\rHashes were updated');
            cb();
        }
    });
}

// bridge between hashes and syncing
function syncInit(err, dataToSync) {
    var elapsedTime = getElapsedTime(startTime);
    if (err) {
        err = "There was a fatal error while comparing files via hash\n" + err;
        console.log(chalk.red(err));
        fm.write(err, fm.generateFooter('called at syncInit', elapedTime));
        sendMail(err);
        return;
    }
    // console.log(chalk.yellow("Data To Sync:\n"), dataToSync);

    // if all hashes matched?

    //process individual files one at a time
    async.mapLimit(dataToSync, 1, processMailingList, function (err, results) {
        // console.log(chalk.yellow("RESULTS:\n"), results);
        if (err) {
            console.error(chalk.red('Error'), err);
            console.log("RESULTS\n", results);
            sendMail(err);
            return;
        }

        //checkForErrors(results);

        updateHashes(results, function (err) {
            if (err) {
                console.error(chalk.red("Error while updating hashes"), err);
                sendMail(err);
            }
            checkForErrors(results);
            var elapsedTime = getElapsedTime(startTime);
            console.log("\nElapsed Time:", elapsedTime);
            fm.generateFooter(null, elapsedTime, results.files);
        });
    });
}

// reads config file and starts the hash comparison
function init(err, links) {
    fm.generateHeader();

    // check for errors while reading config.csv
    if (err) {
        err = 'Unable to read configuration file\n' + err;
        console.log(chalk.red(err));
        var elapsedTime = getElapsedTime(startTime);
        fm.write(err, fm.generateFooter("called cli init()", elapsedTime));
        sendMail(err);
        return;
    }
    hashManager(links, syncInit);
}

var startTime = new Date();
console.log("Started at:", startTime);
ss.readConfig(init);
