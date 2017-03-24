/*eslint-env:node*/
/*eslint no-console:0*/
'use-strict';

var fm = function () {},
    proto = fm.prototype;


const fs = require('fs'),
    fws = require('fixed-width-string'),
    sendMail = require('./email.js');



proto.write = function (string) {
    var filePath = 'test.txt';
    fs.appendFile(filePath, string, function (err) {
        if (err) console.error(err);
    });
}

proto.generateFooter = function (files) {

}

proto.generateFileName = function (file) {
    var name = file.fileName.replace(/^QualtricsSync-/, '');
    name = fws(name.toString(), 30);
    proto.write(name);
}

proto.generateHashErr = function (file) {
    var error = file.hashError;
    error = fws(error, 30);
    proto.write(error);
}

proto.generateFile = function (file) {
    var text = '';

    if (file.fileError) {
        text += fws(file.fileName, 30);
        text += '\r' + file.fileError + '\r';
    } else {
        text += fws("Changes to be Made: " + file.toAlterAmount, 30);
        text += fws("Added: " + file.aCount, 15);
        text += fws("Updated: " + file.uCount, 17);
        text += fws("Deleted: " + file.dCount, 17);
        if (file.StudentErrors) {
            file.studentErrors.forEach(function (error) {
                text += '\r\tFailed to ' + error.action + ' student: ' + error.externalDataReference + 'Error: ' + error.errorMessage;
            });
        }
    }
    proto.write(text);
}

proto.generateHeader = function (configError) {
    var date = new Date(),
        head = '\r\r-------------------------------------------------------------------------------------------------------------------------------\r';
    head += fws(date.toDateString(), 20) + date.toTimeString();
    head += '\r-------------------------------------------------------------------------------------------------------------------------------------\r';
    if (configError !== undefined) {
        head += configError + '\r';
    }
    proto.write(head);
}

module.exports = fm;
