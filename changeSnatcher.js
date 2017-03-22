/* eslint-env node */
/* eslint no-console:0 */
'use strict';

var cs = function () {},
    proto = cs.prototype;

const fs = require('fs'),
    d3 = require('d3-dsv'),
    hash = require('string-hash'),
    async = require('async');


function saveHashes(links) {

}

function compareHashes(links, hashes) {
    console.log("LINKS\n", links);
    console.log("HASHES\n", hashes);
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
    fs.readFile(link.csv, function (err, content) {
        if (err) cb(err);
        link.hash = hash(content.toString());
        cb(null, link);
    });
}

var init = function (links) {

    async.map(links, hashLinks, function (err, links) {
        console.log(links);
        getHashes(links);
    });

}



module.exports = init;
