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
var file = "practice2.tsv";

// adding function to the structure of the object
//reading student list from file
proto.readStudents = function (callback) {
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
        if (response.statusCode !== 200) console.log("Couldn't retrieve students from Qualtrics\n")
        var students = JSON.parse(body);
        callback(students.result.elements);
    });
}

// adds new students to Qualtrics
proto.addStudent = function (option) {
    request(option, function (error, response, body) {
        if (error) throw new Error(error);
        if (response.statusCode === 200) console.log("Student Successfully Added\n");
        else console.log('Add Error: ', body);
    });
}

proto.updateStudent = function (option) {
    request(option, function (error, response, body) {
        if (error) throw new Error(error);
        if (response.statusCode === 200) console.log("Student Successfully Updated\n");
        else console.log('Update Error: ', body);
    });
}

proto.deleteStudent = function (option) {
    request(option, function (error, response, body) {
        if (error) throw new Error(error);
        if (response.statusCode === 200) console.log("Student Successfully Deleted\n");
        else console.log('Delete Error: ', body);
    });
}
module.exports = ss;
