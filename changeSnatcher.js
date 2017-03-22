/* eslint-env node */
/* eslint no-console:0 */
'use strict';

var cs = function () {},
    proto = cs.prototype;

const fs = require('fs'),
    d3 = require('d3-dsv'),
    createHash = require('string-hash'),
    bs = require('binarysearch'),
    async = require('async');


function saveHashes(links) {
    var newHashes;
    links.forEach(function (link) {
        delete link.hash;
    });

    newHashes = d3.csvFormat(links);
    console.log(newHashes);

    fs.writeFile("hashes.csv", newHashes, function (err) {
        if (err) throw err;
    });
}

function compareHashes(links, hashes) {
    var toUpdate;

    console.log("LINKS\n", links);
    //console.log("HASHES\n", hashes);

    toUpdate = links.filter(function (link) {
        var hIndex;
        // run a binary search
        hIndex = bs(hashes, link, sortList);

        //if found, compare
        if (hIndex > -1) {
            if (link.hash != hashes[hIndex].hash) {
                console.log(link.hash);
                console.log(hashes[hIndex].hash);

                return link;
            }
        } else {
            return link;
        }
    });

    //update hashes.csv
    saveHashes(links);

    //start the sync!


    console.log("TOUPDATE", toUpdate.length);
    console.log('FINISHED!');

}


function sortList(a, b) {
    if (a.csv < b.csv) return -1;
    if (a.csv > b.csv) return 1;
    return 0;
}

function getHashes(links) {
    fs.readFile("lists/hashes.csv", function (err, hashes) {
        hashes = d3.csvParse(hashes.toString());
        links.sort(sortList);
        hashes.sort(sortList);
        compareHashes(links, hashes);
    });
}

function hashLinks(link, cb) {
    //ONLY FOR TESTING!
    var file = 'lists/' + link.csv;
    fs.readFile(file, function (err, content) {
        if (err) cb(err);
        link.hash = createHash(content.toString());
        cb(null, link);
    });
}

var init = function (links) {

    async.map(links, hashLinks, function (err, links) {
        getHashes(links);
    });

}



module.exports = init;
