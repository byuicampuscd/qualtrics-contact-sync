// call linkSnatcher & get all mailing list objects
'use strict';

const settings = require('./settings'),
    configPath = settings.configLocation,
    fs = require('fs'),
    d3 = require('d3-dsv'),
    fws = require('fixed-width-string'),
    studentSnatcher = require('./studentSnatcher.js'),
    processMailingList = require('./processMailingList.js'),
    hasher = require('./hash.js'),
    logWriter = require('./logWriter.js'),
    sendMail = require('./email.js'),
    chalk = require('chalk'),
    async = require('async'),
    lw = new logWriter(),
    ss = new studentSnatcher();


function checkForErrors(results) {
    var errsExist = false;
    results.forEach(function (result) {
        if (result.file.passed === false)
            errsExist = true;
    });
    if (errsExist) {
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

    //    console.log('\n\nresults\n\n', results);

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
            lw.write('\rHashes were updated');
            cb();
        }
    });
}

// bridge between hashes and syncing
function syncInit(err, dataToSync) {
    if (err) {
        err = "There was a fatal error while comparing files via hash\n" + err;
        console.log(chalk.red(err));
        lw.write(err, lw.generateFooter('called at syncInit', elapedTime));
        sendMail(err);
        return;
    }
    var elapsedTime = getElapsedTime(startTime);
    // console.log(chalk.yellow("Data To Sync:\n"), dataToSync);

    // if all hashes matched?

    //process individual files one at a time
    async.mapLimit(dataToSync, 1, processMailingList, function (err, results) {
        console.log(chalk.yellow("RESULTS:\n"), results);
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
            lw.generateFooter(null, elapsedTime, results.files);
        });
    });
}

// reads config file and starts the hash comparison
function init(err, links) {
    // Errors while reading config file
    if (err) {
        err = '\nUnable to read configuration file\n' + err;
        console.log(chalk.red(err));
        var elapsedTime = getElapsedTime(startTime);
        lw.generateHeader(err);
        lw.generateFooter(null, elapsedTime);
        sendMail(err);
        return;
    }
    console.log(chalk.yellow(JSON.stringify(links, null, 3)));
    lw.generateHeader();
    /*hasher(links, syncInit);*/
    // dataToSync, limit, function to run, cb
    async.mapLimit(links, 1, hasher, function (err, links) {
        console.log('\nALL LINKS:\n', links);
    });
}

var startTime = new Date();
console.log("Started at:", startTime);
ss.readConfig(init);
