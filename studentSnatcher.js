/* eslint-env node */
/* eslint no-console:0 */
'use strict';

var ss = function () {},
    proto = ss.prototype;

const configPath = 'Z:\\debug.csv',
    request = require('request'),
    fs = require('fs'),
    d3 = require('d3-dsv');

// read the configuration file
proto.readConfig = function (cb) {
    fs.readFile(configPath, function (err, contents) {
        if (err) cb(err, contents);
        else {
            contents = contents.toString();
            var links = d3.csvParse(contents);
            cb(null, links);
        }
    });
}

//reading student list from file
proto.readStudents = function (filePath, callback) {
    fs.readFile(filePath, 'utf8', function (err, contents) {
        if (err) callback(err, contents);
        else {
            //remove zero width no break space from csv (especially the beginning)
            var invisibleSpace = new RegExp(String.fromCharCode(65279), 'g');
            contents = contents.replace(invisibleSpace, '');
            // Excel changes True to TRUE causing unexpected updates
            contents = contents.replace(/TRUE/g, 'True');
            contents = contents.replace(/FALSE/g, 'False');
            var students = d3.csvParse(contents);
            callback(null, students);
        }
    });
}

//pull existing student list from qualtrics
proto.pullStudents = function (options, callback) {
    request(options, function (err, response, body) {
        if (err) {
            // Callback only handles one parameter
            callback(err);
            return;
        } else if (response.statusCode !== 200) {
            // Callback only handles one parameter
            var errMessage = JSON.parse(body).meta.error.errorMessage;
            callback("Couldn't retrieve students from Qualtrics\n\tError: " + errMessage);
            return;
        }
        var students = JSON.parse(body);
        callback(null, students.result.elements, students.result.nextPage);
    });
}

proto.send = function (student, option, callback) {
    request(option, function (err, response, body) {
        if (err) callback(err, body);
        else if (response.statusCode === 200) {
            student.pass = true;
            callback(null, student);
        } else {
            student.pass = false;
            try {
                body = JSON.parse(body);
            } catch (err) {
                console.error(err);
                console.log("Student", student);
                console.log("Body", body);
            }
            student.errorMessage = body.meta.error.errorMessage;
            callback(null, student);
        }
    });
}
module.exports = ss;
