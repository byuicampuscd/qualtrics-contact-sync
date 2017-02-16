/* eslint-env node */
/* eslint no-console:0 */

'use strict';

var pml = function () {},
    proto = pml.prototype,
    ml;

const deepEqual = require('deep-equal'),
    objFilter = require('object-filter'),
    async = require('async'),
    bs = require('binarysearch'),
    chalk = require('chalk'),
    StudentSnatcher = require('./studentSnatcher.js'),
    optionSnatcher = require('./optionSnatcher.js'),
    ss = new StudentSnatcher(),
    os = new optionSnatcher();


function sortList(a, b) {
    if (a.externalDataReference < b.externalDataReference) return -1;
    if (a.externalDataReference > b.externalDataReference) return 1;
    return 0;
}

function formatStudents(students) {
    var keys = Object.keys(students[0]).filter(function (key) {
        return key != 'Email' && key != 'UniqueID' && key != 'FirstName';
    });
    //make students look like qualtrics students
    // TO CHANGE!! will throw an error if firstName or email are empty in file
    var formattedStudents = students.map(function (currVal, formattedStudents) {
        var tStudent = {};
        tStudent = {
            firstName: currVal.FirstName,
            email: currVal.Email,
            externalDataReference: currVal.UniqueID,
            embeddedData: {}
        };
        for (var i = 0; i < keys.length; i++) {
            tStudent.embeddedData[keys[i]] = currVal[keys[i]];
        }
        return tStudent;
    });

    // filters out empty embeddedData values
    var filteredData = {};
    for (var i = 0; i < formattedStudents.length; i++) {
        filteredData = objFilter(formattedStudents[i].embeddedData, function (a) {
            return a != '';
        });
        // check if embeddedData is empty
        if (!Object.keys(filteredData).length) {
            delete formattedStudents[i].embeddedData;
        } else
            formattedStudents[i].embeddedData = filteredData;
    }
    return formattedStudents;
}

function setOptions(student, callback) {
    var option = "";
    // create approptriate API call
    switch (student.action) {
        case 'Add':
            var option = os.add(ml, student);
            break;
        case 'Update':
            var option = os.update(ml, student);
            break;
        case 'Delete':
            var option = os.delete(ml, student.id);
            break;
    }
    ss.send(student, option, callback);
}

function processTheData(students, cb, qStudents) {
    var toAlter = [];

    students.forEach(function (student) {
        var qIndex,
            id;

        // get the index of matching students
        qIndex = bs(qStudents, student, sortList);

        // create copy of qualtrics students without qualtrics-generated data for equality check
        var mappedStudents = qStudents.map(function (x) {
            var temp = {};
            temp.firstName = x.firstName;
            temp.email = x.email;
            temp.externalDataReference = x.externalDataReference;
            temp.embeddedData = x.embeddedData;
            return temp;
        });

        //perform magic decision making logic
        if (qIndex > -1) {
            if (!deepEqual(student, mappedStudents[qIndex])) {
                student.id = qStudents[qIndex].id;
                student.action = 'Update';
                toAlter.push(student);
                qStudents[qIndex].checked = true;
            } else {
                qStudents[qIndex].checked = true;
            }
        } else {
            student.action = 'Add';
            toAlter.push(student);
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

    //make api calls 30 at a time - callback returns here
    async.mapLimit(toAlter, 30, setOptions, function (err, students) {
        if (err) cb(err, students);
        //        if (error) throw new Error(error); THROW ERROR IN CLI.js or just send it a message
        // sort through students and create report based on worked/error attributes
        var failed = [],
            aCount = 0,
            uCount = 0,
            dCount = 0;
        students.forEach(function (student) {
            if (student.pass) {
                if (student.action == "Add")
                    aCount++;
                else if (student.action == "Update")
                    uCount++;
                else
                    dCount++;
            } else
                failed.push(student);
        });
        if (aCount)
            console.log(chalk.green("Students successfully added: " + aCount));
        if (uCount)
            console.log(chalk.green("Students successfully updated: " + uCount));
        if (dCount)
            console.log(chalk.green("Students successfully deleted: " + dCount));

        failed.forEach(function (student) {
            console.log(chalk.red("Failed to " +
                student.action + " student: ") + student.username, chalk.red("Error: " + student.errorMessage));
        });
        //return to cli.js
        cb(err);
    });
}

function pullStudents(students, cb, qStudents, nextPage) {
    if (!qStudents) qStudents = [];
    ss.pullStudents(os.get(ml, nextPage), function (err, newStudents, nextPage) {
        if (err) cb(err, newStudents);
        // add page to student list
        qStudents = qStudents.concat(newStudents);
        if (nextPage) {
            // call again if there was another page of students in qualtrics
            pullStudents(students, cb, qStudents, nextPage);
        } else {
            qStudents.sort(sortList);
            processTheData(students, cb, qStudents);
        }
    });
}
//cb returns to cli
function init(link, cb) {
    ml = link.MailingListID;
    console.log('\n', link.csv);
    // get students from the tsv file
    ss.readStudents(link.csv, function (err, students) {
        if (err) cb(err, students);

        // remove any empty rows
        students = students.filter(function (student) {
            return student.UniqueID && student.UniqueID !== '';
        });

        // format tsv student object for qualtrics
        students = formatStudents(students);
        students.sort(sortList);

        // get students from qualtrics
        pullStudents(students, cb);
    });
}

module.exports = init;
