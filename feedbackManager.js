/*eslint-env:node*/
/*eslint no-console:0*/
'use-strict';

var fm = function () {},
    proto = fm.prototype;


const fs = require('fs'),
    fws = require('fixed-width-string'),
    chalk = require('chalk'),
    sendMail = require('./email.js');

/*proto.getElapsedTime = function (start) {
    var end

    //create elapsed time
    var seconds = (end - start) / 1000,
        minutes = 0,
        hours = 0,
        elapsedTime = "";
    //calculate minutes
    if (seconds >= 60) {
        minutes = Math.floor(seconds / 60);
        seconds = Math.floor(seconds % 60);
    }
    //format seconds
    if (seconds < 10)
        seconds = '0' + seconds;
    //calculate hours
    if (minutes >= 60) {
        hours = Math.floor(minutes / 60);
        minutes = Math.floor(minutes % 60);
    }
    //format minutes
    if (minutes < 10)
        minutes = '0' + minutes;
    //format hours
    if (hours < 10)
        hours = '0' + hours;

    elapsedTime += hours + ":" + minutes + ":" + seconds;
    return elapsedTime;
}*/


proto.write = function (string, cb) {
    var filePath = 'test.txt';
    fs.appendFile(filePath, string, function (err) {
        if (err) console.error(err);
    });
    if (cb != undefined)
        cb();
}

proto.generateFooter = function (message, elapsedTime, files) {
    var footer = '';
    if (message != undefined) {
        footer += message;
    } else {


        footer += '\r' + files;
        footer += '\r-------------------------------------------------------------------------------------------------------------------------------';

    }

    console.log(chalk.green('The log Has been updated'));
    proto.write(footer);
}

proto.generateFile = function (file) {
    var text = '';
    text += '\r\r' + fws(file.fileName, 30);

    if (file.fileError != undefined) {
        //        text += fws(file.fileName, 30);
        text += '\r' + file.fileError;
    } else if (file.sameHash === true) {
        text += '\r\t The hashes matched';
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
    head += '\r-------------------------------------------------------------------------------------------------------------------------------------';
    if (configError !== undefined) {
        head += configError + '\r';
    }
    proto.write(head);
}

module.exports = fm;
