/* eslint-env node */
/* eslint no-console:0 */
'use strict';

var ss = function () {},
    proto = ss.prototype;

const request = require('request'),
    fs = require('fs'),
    d3 = require('d3-dsv');


//get all mailing lists from qualtrics
proto.getMailingLists = function (option, callback) {
    request(option, function (err, response, body) {
        if (response.statusCode !== 200)
            console.log("Couldn't retrieve mailing lists from Qualtrics\n");
        var mls = JSON.parse(body).result.elements;
        callback(err, mls);
    });
}

//reading student list from file
proto.readStudents = function (filePath, callback) {
    fs.readFile(filePath, 'utf8', function (err, contents) {
        if (err) {
            throw (err);
        }
        //remove zero width no break space from csv (especially the beginning)
        var regEx = new RegExp(String.fromCharCode(65279), 'g');
        contents = contents.replace(regEx, '');
        var lines = contents.toString();
        var students = d3.csvParse(lines);
        callback(students);
    });
}

//pull existing student list from qualtrics
proto.pullStudents = function (options, callback) {
    request(options, function (error, response, body) {
        if (response.statusCode !== 200)
            console.log("Couldn't retrieve students from Qualtrics\n");
        var students = JSON.parse(body);
        callback(error, students.result.elements, students.result.nextPage);
    });
}

proto.send = function (student, option, cb) {
    request(option, function (error, response, body) {
        if (response.statusCode === 200) {
            student.pass = true;
            cb(null, student);
        } else {
            student.pass = false;
            body = JSON.parse(body);
            student.errorMessage = body.meta.error.errorMessage;
            cb(error, student);
        }
    });
}
module.exports = ss;
