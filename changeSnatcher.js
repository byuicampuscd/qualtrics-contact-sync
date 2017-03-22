/* eslint-env node */
/* eslint no-console:0 */
'use strict';

var cs = function () {},
    proto = cs.prototype;

const fs = require('fs'),
    hash = require('string-hash'),
    async = require('async');




/*function compareHashes(cb, ) {

}

function getHashes() {

}

function hashLinks(link, cb) {
    fs.readFile(link.csv, function (err, content) {
        if (err) cb(err);
        link.hash = hash(content.toString());
        cb(null, cb);
    });
}

function init(err, links) {
    //check for errors while reading config.csv
    if (err) {
        err = 'Unable to read configuration file\n' + err;
        sendMail(err);
        console.log(chalk.red(err));
        generateReport(err, null);
        return;
    }
    var start = new Date();

    console.log("links length", links.length);

    async.map(links, hashLinks, function (err, links) {
        console.log(links);
    });*/







proto.init = function () {
    console.log('hello');
}



module.exports = cs;
