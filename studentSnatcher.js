/* eslint-env node, es6 */
/* eslint no-console:0 */
'use strict';

var ss = function () {},
    proto = ss.prototype;

const settings = require('./settings.json'),
    request = require('request'),
    fs = require('fs'),
    chalk = require('chalk'),
    d3 = require('d3-dsv');

/********************************
 * read the configuration file
 ********************************/
proto.readConfig = function (cb) {
    fs.readFile(settings.configLocation, function (err, contents) {
        if (err) cb(err, contents);
        else {
            contents = contents.toString();
            var links = d3.csvParse(contents);
            cb(null, links);
        }
    });
};

/*********************
 * read a csv file
 *********************/
proto.readStudents = function (filePath, callback) {
    fs.readFile(filePath, 'utf8', function (err, contents) {
        if (err) callback(err, contents);
        else {
            /* remove zero width no break space from csv (especially the beginning) */
            var invisibleSpace = new RegExp(String.fromCharCode(65279), 'g');
            contents = contents.replace(invisibleSpace, '');
            /* Excel changes True to TRUE causing unexpected updates */
            contents = contents.replace(/TRUE/g, 'True');
            contents = contents.replace(/FALSE/g, 'False');
            var students = d3.csvParse(contents);
            callback(null, students);
        }
    });
};

/*********************************************
 * pull existing student list from qualtrics
 *********************************************/

// DO ALL OF THE IF STATEMENTS CAUSE HANGING?
proto.pullStudents = function (options, callback) {
    request(options, function (err, response, body) {
        if (err) {
            callback(err, null, null);
            return;
        } else if (response.statusCode !== 200) {
            /* Try is to handle HTML responses */
            var errMessage = 'Unknown Error. Server responded with HTML';
            try {
                errMessage = JSON.parse(body).meta.error.errorMessage;
            } catch (err) {
                console.error(chalk.red(err));
            } finally {
                callback('Couldn\'t retrieve students from Qualtrics\n\tError: ' + errMessage, null, false);
            }
            return;
        } else {
            /* I don't think the server ever responds with HTML on success */
            try {
                var students = JSON.parse(body);
            } catch (err) {
                console.error(chalk.red(err));
                console.log(response.statusCode);
                callback(err, null, false);
                return;
            }
            callback(null, students.result.elements, students.result.nextPage);
        }
    });
};

/********************************************************
 * send a POST, PUT, or DELETE request to qualtrics API
 ********************************************************/
proto.send = function (student, option, callback) {
    //    console.log(chalk.magenta('sending student'));
    request(option, function (err, response, body) {
        if (err) {
            /* shouldn't ever throw a file error here... */
            student.pass = false;
            student.errorMessage = err; // Sometimes throws a parse error
            callback(null, student);
        } else if (response.statusCode === 200) {
            student.pass = true;
            callback(null, student);
        } else {
            student.pass = false;
            try {
                /* on 503 the server returns html which can't be parsed */
                body = JSON.parse(body);
                student.errorMessage = body.meta.error.errorMessage;
            } catch (err) {
                student.errorMessage = 'Status Code: ' + response.statusCode;
            }
            student.pass = false;
            //console.log("Student", student);
            //console.log("Body", body);
            callback(null, student);
        }
    });
};
module.exports = ss;