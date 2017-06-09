/* eslint-env node */
/* eslint no-console:0 */
'use strict';

const logWriter = require('./logWriter.js'),
    fs = require('fs'),
    createHash = require('string-hash'),
    chalk = require('chalk'),
    settings = require('./settings.json'),
    processMailingList = require('./processMailingList.js'),
    async = require('async'),
    lw = new logWriter();

// TO DO!!!!
// double check the log & ensure it's writing correctly



/********************************
 * wraps the link object for use by the rest of the program
 * file will contain data about the sync
 *********************************/
function formatLink(link, cb) {
    var wrappedLink = {
        link: link,
        file: false
    }
    //console.log('\nformattedLink:\n', wrappedLink);
    if (wrappedLink.link.matchingHashes === true) {
        cb(null, wrappedLink);
    } else {
        processMailingList(wrappedLink, cb);
    }
}

/*********************************
 * compare the hashes - same logic as processMailingList
 *********************************/
function compareHash(link, cb) {
    if (link.hash == link.newHash) {
        console.log('\n', chalk.blue(link.csv));
        console.log(chalk.green('Hashes Matched'));
        link.matchingHashes = true;
        //output to the log!
        var result = {
            file: false,
            link: link
        };
        lw.generateFile(result);
    } else {
        link.matchingHashes = false;
    }
    //console.log(chalk.yellow('LINK:\n'), link);
    formatLink(link, cb);
}

/*******************************
 * hash each file in the config file
 * saved to link objects
 ******************************/
function hashLinks(link, cb) {
    var file = settings.filePath + link.csv;
    fs.readFile(file, function (err, content) {
        if (err) {
            console.log('err hashing', chalk.red(err));
            //tell the log that the file cannot be processed
            var result = {
                link: link,
                file: {
                    fileName: link.csv,
                    fileError: err.toString()
                }
            };
            lw.generateFile(result);
            //skip this file and keep going!
            cb(null, result);
            return;
        }
        link.newHash = createHash(content.toString());
        compareHash(link, cb);
    });
}

/****************************
 * THIS FUNCTION IS NOT CURRENTLY BEING USED
 ****************************/
function init(links, cb) {
    async.map(links, hashLinks, function (err, links) {
        if (err) {
            //this should never be called
            cb(err);
            return;
        }
        //filter out empty values (fileErrors) WHY????
        links = links.filter(function (link) {
            if (link !== null) return link;
        });

        // if all were empty that means none of the files could be read
        if (links.length <= 0) {
            lw.generateFooter("None of the files in config.csv could be read");
            return;
        }
        //console.log('LINKS:\n', links);
        compareHashes(links, cb);
    });
}

module.exports = hashLinks;
