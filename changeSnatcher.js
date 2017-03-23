/* eslint-env node */
/* eslint no-console:0 */
'use strict';

const fs = require('fs'),
    d3 = require('d3-dsv'),
    createHash = require('string-hash'),
    bs = require('binarysearch'),
    chalk = require('chalk'),
    async = require('async');

function saveHashes(links, cb) {
    links.forEach(function (link) {
        link.hash = link.newHash;
        delete link.newHash;
    });

    var toWrite = d3.csvFormat(links);
    fs.writeFile("Z:\\debug.csv", toWrite, function (err) {
        if (err) cb(err);
        console.log(chalk.green("New hashes saved!"));
    });
}

//compare the hashes - same logic as processMailingList
function compareHashes(links, hashes, cb) {
    var toUpdate;

    //    console.log('LINKS:\n', links);
    //    console.log('HASHES:\n', hashes);

    toUpdate = links.filter(function (link) {
        var hIndex;
        // run a binary search
        hIndex = bs(hashes, link, sortList);

        //if found, compare
        if (hIndex > -1) {
            if (link.newHash != hashes[hIndex].hash) {
                return link;
            }
        } else {
            return link;
        }
    });

    //update hashes.csv
    // if this errs then cli syncInit will be called up twice & mess everything up...
    //    saveHashes(links, cb);

    //start the sync!
    cb(null, toUpdate);
}


function sortList(a, b) {
    if (a.csv < b.csv) return -1;
    if (a.csv > b.csv) return 1;
    return 0;
}

//create separate array of the existing hashes. sort the lists
function getHashes(links, cb) {
    var tempObj = {},
        hashes = [];

    hashes = links.filter(function (link) {
        tempObj.hash = link.hash;
        tempObj.csv = link.csv;
        return tempObj;
    });

    links.sort(sortList);
    hashes.sort(sortList);
    compareHashes(links, hashes, cb);
}

//hash each file in the config file - saved to link objects
function hashLinks(link, callback) {
    var file = 'Z:\\' + link.csv;
    fs.readFile(file, function (err, content) {
        if (err) callback(err);
        link.newHash = createHash(content.toString());
        callback(null, link);
    });
}

//cb is the final callback!
function init(links, cb) {
    async.map(links, hashLinks, function (err, links) {
        if (err) cb(err);
        getHashes(links, cb);
    });
}

module.exports = init;
