/* eslint-env node */
/* eslint no-console:0 */
'use strict';

const feedbackManager = require('./feedbackManager.js'),
    fs = require('fs'),
    createHash = require('string-hash'),
    chalk = require('chalk'),
    async = require('async'),
    fm = new feedbackManager();

//creates the object tha will be used for the rest of the program
function createDataToSync(links, cb) {
    var dataToSync = [],
        tempObj = {};

    dataToSync = links.map(function (link) {
        tempObj = {};
        tempObj.link = link;
        tempObj.file = false;
        return tempObj;
    });
    //    console.log(chalk.yellow('data to sync:\n'), dataToSync);

    cb(null, dataToSync);
}

//compare the hashes - same logic as processMailingList
function compareHashes(links, cb) {
    links.forEach(function (link) {
        console.log('\n', chalk.blue(link.csv));
        console.log('Comparing Hashes');
        if (link.hash == link.newHash) {
            console.log(chalk.green('Hashes Matched'));
            link.matchingHashes = true;
            //output to the log!
            var result = {
                file: false,
                link: link
            };
            fm.generateFile(result);
        } else {
            console.log(chalk.yellow("Hashes Didn't Match"));
            link.matchingHashes = false;
        }
    });
    //console.log(chalk.yellow('LINKS:\n'), links);

    //start the sync! return to cli
    createDataToSync(links, cb);
}

//hash each file in the config file - saved to link objects
function hashLinks(link, callback) {
    var file = 'Z:\\' + link.csv;
    fs.readFile(file, function (err, content) {
        if (err) {
            console.log(chalk.red(err));
            //tell the log that the file cannot be processed
            fm.generateFile({
                file: {
                    fileName: link.csv,
                    fileError: err
                }
            });
            //skip this file and keep going!
            callback();
            return;
        }
        link.newHash = createHash(content.toString());
        callback(null, link);
    });
}

//cb is the final callback! (syncInit)
function init(links, cb) {
    async.map(links, hashLinks, function (err, links) {
        if (err) {
            //this should never be called
            cb(err);
            return;
        }
        //filter out empty values (fileErrors)
        links = links.filter(function (link) {
            if (link !== null) return link;
        });

        // if all were empty that means none of the files could be read
        if (links.length <= 0) {
            fm.generateFooter("called from hashManager init");
            return;
        }

        //console.log('LINKS:\n', links);
        compareHashes(links, cb);
    });
}

module.exports = init;
