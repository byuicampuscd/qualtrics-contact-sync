/* eslint-env node */
/* eslint no-console:0 */

'use strict';

var pml = function () {},
    proto = pml.prototype,
    link;

const deepEqual = require('deep-equal'),
    async = require('async'),
    objFilter = require('object-filter'),
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

function filterEmbeddedData(student) {
    console.log('\nPre-Filtered Student\n', student);
    var filteredStudent = objFilter(student, function (value) {
        return value !== '';
    });
    console.log('\nFiltered Student\n', filteredStudent);

    var filteredData = objFilter(student.embeddedData, function (value) {
        return value !== '';
    });

    if (Object.keys(filteredData).length <= 0) {
        delete filteredStudent.embeddedData;
        console.log('Without Embedded Data', filteredStudent);
        return filteredStudent;
    } else {
        filteredStudent.embeddedData = filteredData;
        console.log('With Embedded Data', filteredStudent);
        return filteredStudent;
    }
}

function formatStudents(students) {
    // create keys for student object
    var emdKeys = Object.keys(students[0]).filter(function (key) {
        return key != 'Email' && key != 'UniqueID' && key != 'FirstName';
    });
    // create keys for embeddedData object
    var keys = Object.keys(students[0]).filter(function (key) {
        return key == 'Email' || key == 'UniqueID' || key == 'FirstName';
    });

    var formattedStudents = students.map(function (currVal, formattedStudents) {
        var tStudent = {},
            tEmbeddedData = {};
        //format keys and create tempStudent object
        for (var j = 0; j < keys.length; j++) {
            //UniqueID must be converted to externalDataReference
            if (keys[j] === 'UniqueID') {
                tStudent.externalDataReference = currVal[keys[j]];
            } else {
                //first letter of each key ot lower case
                tStudent[keys[j][0].toLowerCase() + keys[j].slice(1)] = currVal[keys[j]];
            }
        }
        //create embeddedData object
        for (var i = 0; i < emdKeys.length; i++) {
            tEmbeddedData[emdKeys[i]] = currVal[emdKeys[i]];
        }

        if (emdKeys.length > 0)
            tStudent.embeddedData = tEmbeddedData;

        return tStudent;
    });
    return formattedStudents;
}

function setOptions(student, callback) {
    var option = "";
    // create approptriate API call
    switch (student.action) {
        case 'Add':
            var option = os.add(link.MailingListID, student);
            break;
        case 'Update':
            var option = os.update(link.MailingListID, student);
            break;
        case 'Delete':
            var option = os.delete(link.MailingListID, student.id);
            break;
    }
    // Send request
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
        var mappedStudents = qStudents.map(function (obj) {
            var temp = {};
            temp.firstName = obj.firstName;
            temp.email = obj.email;
            temp.externalDataReference = obj.externalDataReference;
            temp.embeddedData = obj.embeddedData;
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
            // Filter out empty values that can't be added!
            toAlter.push(filterEmbeddedData(student));
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
        //        if (err) cb(err, students);

        var file = {
            fileName: link.csv.replace('lists/', ''),
            toAlterAmount: students.length, // I think that'll work...
            aCount: 0,
            uCount: 0,
            dCount: 0,
            passed: true,
            failed: []
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
                file.failed.push(student);
        });

        // generate report of completed additions/updates/deletions
        if (file.aCount > 0)
            console.log(chalk.green("Students successfully added: " + file.aCount));
        if (file.uCount > 0)
            console.log(chalk.green("Students successfully updated: " + file.uCount));
        if (file.dCount > 0)
            console.log(chalk.green("Students successfully deleted: " + file.dCount));


        file.failed.forEach(function (student) {
            console.log(chalk.red("Failed to " +
                student.action + " student: ") + student.externalDataReference, chalk.red("Error: " + student.errorMessage));
        });

        if (file.failed.length)
            file.passed = false;

        //return to cli.js
        cb(err, file);
    });
}

function pullStudents(students, cb, qStudents, nextPage) {
    if (!qStudents) qStudents = [];
    ss.pullStudents(os.get(link.MailingListID, nextPage), function (err, newStudents, nextPage) {
        if (err)
            cb(err);
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
function init(list, cb) {
    link = list;
    console.log('\n', chalk.blue(link.csv));
    // get students from the tsv file
    ss.readStudents(link.csv, function (err, students) {
        if (err) cb(err, students);

        // remove any empty rows
        students = students.filter(function (student) {
            return student.UniqueID && student.UniqueID !== '';
        });

        // format tsv student object for qualtrics
        if (students.length) {
            students = formatStudents(students);
            students.sort(sortList);
        }

        // get students from qualtrics
        pullStudents(students, cb);
    });
}

module.exports = init;
