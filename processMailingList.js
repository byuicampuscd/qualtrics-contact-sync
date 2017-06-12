/* eslint-env node */
/* eslint no-console:0 */
'use strict';

var link;

var deepEqual = require('deep-equal'),
    objFilter = require('object-filter'),
    bs = require('binarysearch'),
    chalk = require('chalk'),
    StudentSnatcher = require('./studentSnatcher.js'),
    optionSnatcher = require('./optionSnatcher.js'),
    logWriter = require('./logWriter.js'),
    async = require('async'),
    lw = new logWriter(),
    ss = new StudentSnatcher(),
    os = new optionSnatcher();

/**************************
 * sort based on unique ID
 **************************/
function sortList(a, b) {
    if (a.externalDataReference < b.externalDataReference) return -1;
    if (a.externalDataReference > b.externalDataReference) return 1;
    return 0;
}

/************************************
 *format errors and send to callback
 *************************************/
function sendFileError(err, cb) {
    var result = {
        link: link,
        file: {
            fileName: link.csv,
            fileError: err.toString()
        }
    };
    console.log(chalk.red(err));

    lw.generateFile(result);
    cb(null, result);
}

/**********************************************************
 * called once the API calls to qualtrics finish
 * formats results of the calls, such as added, updated, 
 * and deleted count
 ********************************************************/
function generateFileData(err, students) {
    if (err) {
        console.error(err);
        sendFileError(err, cb);
        return;
    }
    // file is returned to cli.js
    var cb = this,
        file = {
            fileName: link.csv,
            toAlterAmount: students.length,
            aCount: 0,
            uCount: 0,
            dCount: 0,
            passed: true,
            studentErrors: [],
            fileError: null
        };
    // sort through students and create report based on worked/error attributes
    students.forEach(function (student) {
        if (student.pass) {
            if (student.action == "Add")
                file.aCount++;
            else if (student.action == "Update")
                file.uCount++;
            else
                file.dCount++;
        } else
            file.studentErrors.push(student);
    });

    // generate report of completed additions/updates/deletions
    if (file.aCount > 0)
        console.log(chalk.green("Students successfully added: " + file.aCount));
    if (file.uCount > 0)
        console.log(chalk.green("Students successfully updated: " + file.uCount));
    if (file.dCount > 0)
        console.log(chalk.green("Students successfully deleted: " + file.dCount));

    file.studentErrors.forEach(function (student) {
        console.log(chalk.red("Failed to " +
            student.action + " student: ") + student.externalDataReference, chalk.red("Error: " + student.errorMessage));
    });
    if (file.studentErrors.length)
        file.passed = false;
    // console.log('FILE:\n', file);

    var wrapper = {
        file: file,
        link: link
    };

    lw.generateFile(wrapper);

    // return to cli.js
    cb(err, wrapper);

}

/***********************************************
 * create approptriate API call for each action
 ************************************************/
function setOptions(student, callback) {
    //    console.log(chalk.magenta('setOptions'));
    var option = "";
    // create approptriate API call
    switch (student.action) {
        case 'Add':
            option = os.add(link.MailingListID, student);
            break;
        case 'Update':
            option = os.update(link.MailingListID, student);
            break;
        case 'Delete':
            option = os.delete(link.MailingListID, student.id);
            break;
    }
    ss.send(student, option, callback);
}

/***********************************************
 * filter student object for equality comparison
 *************************************************/
function filterStudent(student) {
    // filter student outside of embeddedData
    var filteredStudent = objFilter(student, function (value) {
        return value !== '' && value !== null;
    });
    //Only filter student (without EmbeddedData) when updating them
    if (student.action == 'Update')
        return filteredStudent;

    if (student.embeddedData === null) {
        delete filteredStudent.embeddedData;
    } else {
        // filter embeddedData
        var filteredData = objFilter(student.embeddedData, function (value) {
            return value !== '' && value !== null;
        });

        // append filteredData if not empty
        if (Object.keys(filteredData).length <= 0) {
            delete filteredStudent.embeddedData;
        } else {
            filteredStudent.embeddedData = filteredData;
        }
    }
    return filteredStudent;
}

/********************************************************
 * sorts the qualtrics list & csv lists and uses a binary
 * search to check for equality
 ********************************************************/
function compareStudents(students, cb, qStudents) {
    console.log(chalk.magenta('Comparing Students'));
    var toAlter = [];

    students.forEach(function (student) {
        var qIndex;

        // get the index of matching students
        qIndex = bs(qStudents, student, sortList);

        // perform magic decision making logic
        if (qIndex > -1) {
            //create version to use for equality check
            var filteredQStudent = filterStudent(qStudents[qIndex]);
            delete filteredQStudent.id;
            delete filteredQStudent.unsubscribed;
            delete filteredQStudent.responseHistory;
            delete filteredQStudent.emailHistory;

            //EQUALITY COMPARISON. THIS IS WHERE MOST PROBLEMS HAVE OCCURED
            if (!deepEqual(filterStudent(student), filteredQStudent)) {
                // console.log("\n\n Student: ", filterStudent(student));
                // console.log("\n\nQ Student:", filteredQStudent);
                student.id = qStudents[qIndex].id;
                student.action = 'Update';
                student = filterStudent(student); // don't filter to throw error when updating student with empty values
                toAlter.push(student);
                qStudents[qIndex].checked = true;
            } else {
                qStudents[qIndex].checked = true;
            }
        } else {
            student.action = 'Add';
            // Filter out empty values that can't be added!
            toAlter.push(filterStudent(student));
        }
    });
    // exists in qualtrics but not in master file
    qStudents.forEach(function (student) {
        if (!student.checked) {
            student.action = 'Delete';
            toAlter.push(student);
        }
    });

    console.log('Changes to be made: ', toAlter.length);

    // make api calls X at a time -- callback returns here
    // .bind sends the final cb to generateFileData as the this value
    async.mapLimit(toAlter, 10, setOptions, generateFileData.bind(cb));
}

/*********************************************
 * pulls student data from qualtrics until
 * nextPage is false
 **********************************************/
function pullStudents(students, cb, qStudents, nextPage) {
    //    console.log(chalk.magenta('pullStudents'));
    if (!qStudents) qStudents = [];
    ss.pullStudents(os.get(link.MailingListID, nextPage), function (err, newStudents, nextPage) {
        if (err) {
            sendFileError(err, cb);
            return;
        }
        // add page to student list
        qStudents = qStudents.concat(newStudents);
        if (nextPage) {
            // call again if there was another page of students in qualtrics
            pullStudents(students, cb, qStudents, nextPage);
        } else {
            qStudents.sort(sortList);
            compareStudents(students, cb, qStudents);
        }
    });
}

/***********************************************
 * filter student object so the format matches 
 * qualtrics api format
 *************************************************/
function formatStudents(students) {
    // console.log(chalk.magenta('formatting Students'));
    // create keys for embeddedData object
    var emdKeys = Object.keys(students[0]).filter(function (key) {
        return key != 'Email' && key != 'UniqueID' && key != 'FirstName';
    });
    // create keys for student object
    var keys = Object.keys(students[0]).filter(function (key) {
        return key == 'Email' || key == 'UniqueID' || key == 'FirstName';
    });

    var formattedStudents = students.map(function (currVal, formattedStudents) {
        var tStudent = {},
            tEmbeddedData = {};
        // format keys and create tempStudent object
        for (var j = 0; j < keys.length; j++) {
            // UniqueID must be converted to externalDataReference
            if (keys[j] === 'UniqueID') {
                tStudent.externalDataReference = currVal[keys[j]];
            } else {
                // first letter of each key ot lower case
                tStudent[keys[j][0].toLowerCase() + keys[j].slice(1)] = currVal[keys[j]];
            }
        }
        var commaFinder = new RegExp(/,/g);

        // create embeddedData object
        for (var i = 0; i < emdKeys.length; i++) {
            // filter commas out of embeddedData values so the qualtrics api won't throw a fit
            tEmbeddedData[emdKeys[i]] = currVal[emdKeys[i]].replace(commaFinder, '');
        }

        if (emdKeys.length > 0)
            tStudent.embeddedData = tEmbeddedData;

        return tStudent;
    });
    return formattedStudents;
}

/******************************************
 * Pull student data from csv & format it
 * to match qualtrics API
 *****************************************/
function init(wrapper, cb) {
    // console.log(chalk.yellow('data to sync:\n'), wrapper);
    link = wrapper.link;

    console.log('\n', chalk.blue(link.csv));
    var filePath = 'Z:\\' + link.csv;
    // get students from the csv file
    ss.readStudents(filePath, function (err, students) {
        if (err) {
            sendFileError(err, cb);
            return;
        }

        // remove any empty rows
        students = students.filter(function (student) {
            return student.UniqueID && student.UniqueID !== '';
        });

        // format csv student object to match qualtrics API format
        if (students.length) {
            students = formatStudents(students);
            students.sort(sortList);
        }

        // get students from qualtrics
        console.log(chalk.magenta('Pulling students from Qualtrics'));
        pullStudents(students, cb);
    });
}

module.exports = init;
