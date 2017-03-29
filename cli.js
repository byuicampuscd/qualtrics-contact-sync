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

    /*results.forEach(function (result) {
    console.log("Result", result);
    console.log("Result.file", result.file);
    console.log("Result.link", result.link);
    console.log("Result.csv", result.csv);
});*/

    /*toUpdate = results.map(function (result) {
        console.log('SILDFBGS ', result);
        tempLink.csv = result.link.csv;
        tempLink.MailingListID = result.link.MailingListID;
        tempLink.LibraryID = result.link.LibraryID;
        tempLink.hash = result.link.newHash;
        return tempLink;
    });*/

    /* var toWrite = d3.csvFormat(toUpdate);
 fs.writeFile(configPath, toWrite, function (err) {
     if (err) cb(err);
     console.log(chalk.green("New hashes saved!"));
     fm.write('\rHashes have been updated');
     cb();
 });*/
    cb();
}

//bridge between hashes and syncing
function syncInit(err, dataToSync) {
    var elapsedTime = getElapsedTime(startTime);
    if (err) {
        err = "There was a fatal error while comparing files via hash\n" + err;
        console.log(chalk.red(err));
        fm.write(err, fm.generateFooter('called at syncInit', elapedTime));
        sendMail(err);
        return;
    }

    //if all hashes matched?
    //    console.log(chalk.yellow("Data To Sync:\n"), dataToSync);

    //process individual files one at a time
    async.mapLimit(dataToSync, 1, processMailingList, function (err, results) {
        //        console.log(chalk.yellow("RESULTS:\n"), results);
        //        console.log(chalk.yellow("RESULTS.LINK:\n"), results[0].link);



        //UPDATE HASHES
        updateHashes(dataToSync, function (err) {
            if (err) {
                console.error(err);
            }
            var elapsedTime = getElapsedTime(startTime);
            console.log("\nElapsed Time:", elapsedTime);
            fm.generateFooter(null, elapsedTime, results.files);
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
        sendMail(err);
        return;
    }

    hashManager(links, syncInit);
}

var startTime = new Date();
console.log("Started at:", startTime);
ss.readConfig(init);
