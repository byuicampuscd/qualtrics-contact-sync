/*eslint-env node*/
/*eslint no-console:0*/


/***************************************************
 * This program's wording suggests students are
 * being synced, when in actuality the csv's don't
 * always contain student data
 ***************************************************/

'use strict';

const settings = require('./settings'),
    configPath = settings.configLocation,
    fs = require('fs'),
    d3 = require('d3-dsv'),
    studentSnatcher = require('./studentSnatcher.js'),
    hasher = require('./hash.js'),
    logWriter = require('./logWriter.js'),
    sendMail = require('./email.js'),
    timer = require('./timer.js'),
    chalk = require('chalk'),
    async = require('async'),
    lw = new logWriter(),
    ss = new studentSnatcher();

var startTime = new Date();


/*********************************************
 * scans the results of the sync for errors
 * and send an email if any are found
 *********************************************/
function checkForErrors(results) {
    var errsExist = false;
    results.forEach(function (result) {
        if (result.file.passed === false || result.file.fileError != undefined)
            errsExist = true;
    });
    if (errsExist) {
        sendMail('There was an error with the Qualtrics Sync Tool. Please refer to the log for more detail');
    }
}

/***********************************************
 * Returns formatted start time - current time 
 ***********************************************/
function getElapsedTime() {
    var end = new Date();
    //create elapsed time
    var seconds = (end - startTime) / 1000,
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

/*****************************************************
 * re-writes the config file with the updated hashes
 *****************************************************/
function updateHashes(results, cb) {
    var toUpdate = [],
        tempLink = {},
        matchingHashCount = 0,
        failed = 0;

    try {
        toUpdate = results.map(function (result) {
            tempLink = {};

            tempLink.csv = result.link.csv;
            tempLink.MailingListID = result.link.MailingListID;
            tempLink.LibraryID = result.link.LibraryID;

            if (result.file.passed === true) {
                tempLink.hash = result.link.newHash;
            } else {
                tempLink.hash = result.link.hash;
                failed++;
            }

            if (result.link.matchingHashes === true)
                matchingHashCount++;

            return tempLink;
        });
    } catch (err) {
        cb(err);
        return;
    }

    // Don't update the hashes if they all matched or if they all had errors
    if (matchingHashCount == toUpdate.length || failed == toUpdate.length) {
        cb();
        return;
    }

    var toWrite = d3.csvFormat(toUpdate);
    fs.writeFile(configPath, toWrite, function (err) {
        if (err) cb(err);
        else {
            console.log(chalk.green("New hashes saved!"));
            lw.writeSync('\rHashes were updated', cb);
        }
    });
}

/****************************************
 * Updates the hashes, checks for errors,
 * and writes the footer after the sync
 *****************************************/
function processResults(err, results) {
    if (err) {
        console.error("A fatal error occured:", chalk.red(err));
        if (typeof results === "object")
            JSON.stringify(results);
        //console.log(chalk.yellow(results));
        lw.write(err, lw.generateFooter('called at syncInit', getElapsedTime()));
        sendMail(err);
    }
    //console.log('\nALL LINKS:\n', results);

    updateHashes(results, function (err) {
        if (err) {
            console.error(chalk.red("Error while updating hashes"), err);
            sendMail(err);
        }
        checkForErrors(results);
        console.log("\nElapsed Time:", getElapsedTime());
        lw.generateFooter(null, getElapsedTime(), results.files);
    });
}

/**********************************************
 * reads the config file and starts the sync
 **********************************************/
function init() {
    console.log("Started at:", startTime);

    ss.readConfig(function (err, links) {
        if (err) {
            err = '\nUnable to read configuration file\n' + err;
            console.log(chalk.red(err));
            var elapsedTime = getElapsedTime();
            lw.generateHeader(err);
            lw.generateFooter(null, elapsedTime);
            sendMail(err);
            return;
        }
        //console.log(chalk.yellow(JSON.stringify(links, null, 3)));
        lw.generateHeader();
        async.mapLimit(links, 1, hasher, processResults);
    });
}

//module.exports = init;
//init();
timer(init);