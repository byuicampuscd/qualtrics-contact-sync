/* eslint-env node */
/* eslint no-console:0 */
'use strict';

// new object from value of Function.prototype
var ss = function () {}; //consturctor   
var proto = ss.prototype;

// defining private vars
var request = require('request');
var fs = require('fs');
var d3 = require('d3-dsv');
var file = process.argv[2];


// adding function to the structure of the object
//reading student list from file
proto.readStudents = function (callback) {
    fs.readFile(file, 'utf8', function (err, contents) {
        if (err) {
            throw (err);
        }
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
