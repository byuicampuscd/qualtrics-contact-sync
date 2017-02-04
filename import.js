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
var file = "practice.tsv";

// adding function to the structure of the object
//getting student list from file
proto.getStudents = function (callback) {
        fs.readFile(file, function (err, contents) {
            if (err) {
                throw (err);
            }
            var lines = contents.toString();
            var students = d3.tsvParse(lines);
            callback(students);
        });

    }
    //pull existing student list from qualtrics
proto.pullStudents = function (options, callback) {
    request(options, function (error, response, body) {
        if (error) throw new Error(error);
        var students = JSON.parse(body);
        callback(students.result.elements);
    });
}

// adds new students to Qualtrics
proto.addStudent = function (option, student) {
    option.body = student;
    request(option, function (error, response, body) {
        if (error) throw new Error(error);
        console.log(body);
    });
}

proto.updateStudent = function () {

}

proto.deleteStudent = function () {

}
module.exports = ss;
