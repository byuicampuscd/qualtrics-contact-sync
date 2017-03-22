/* eslint-env node */
/* eslint no-console:0 */
'use strict';

//var cs = function () {},
//    proto = cs.prototype;

const fs = require('fs'),
    d3 = require('d3-dsv'),
    createHash = require('string-hash'),
    bs = require('binarysearch'),
    chalk = require('chalk'),
    async = require('async');

//var finalCallback;

function saveHashes(links) {
    var toWrite = d3.csvFormat(links);

    fs.writeFile("testConfig.csv", toWrite, function (err) {
        if (err) cb(err);
        //        console.log(chalk.green("New hashes saved!"));
    });
}

function compareHashes(links, hashes, cb) {
    var toUpdate;

    //console.log("LINKS\n", links);
    //console.log("HASHES\n", hashes);

    toUpdate = links.filter(function (link) {
        var hIndex;
        // run a binary search
        hIndex = bs(hashes, link, sortList);

        //if found, compare
        if (hIndex > -1) {
            if (link.hash != hashes[hIndex].hash) {
                return link;
            }
        } else {
            return link;
        }
    });
    //    console.log("TOUPDATE", toUpdate.length);

    //update hashes.csv
    saveHashes(links, cb);

    //start the sync!
    cb(null, toUpdate);
}


function sortList(a, b) {
    if (a.csv < b.csv) return -1;
    if (a.csv > b.csv) return 1;
    return 0;
}

function getHashes(links, cb) {
    fs.readFile("lists/hashes.csv", function (err, hashes) {
        if (err) cb(err);
        hashes = d3.csvParse(hashes.toString());
        links.sort(sortList);
        hashes.sort(sortList);
        compareHashes(links, hashes, cb);
    });
}

function hashLinks(link, cb) {
    //ONLY FOR TESTING!
    //    var file = 'lists/' + link.csv;
    var file = link.csv;
    fs.readFile(file, function (err, content) {
        if (err) cb(err);
        link.hash = createHash(content.toString());
        cb(null, link);
    });
}

function init(links, cb) {
    //    finalCallback = cb;
    async.map(links, hashLinks, function (err, links) {
        getHashes(links, cb);
    });

}



module.exports = init;
