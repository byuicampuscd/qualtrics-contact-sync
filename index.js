/* eslint-env node */
/* eslint no-console:0 */

'use strict';
const deepEqual = require('deep-equal'),
    objFilter = require('object-filter'),
    async = require('async'),
    bs = require('binarysearch'),
    StudentSnatcher = require('./studentSnatcher.js'),
    optionSnatcher = require('./optionSnatcher.js'),
    ss = new StudentSnatcher(),
    os = new optionSnatcher();
//import mapLimit from 'async/mapLimit';



function sortList(a, b) {
    if (a.externalDataReference < b.externalDataReference) return -1;
    if (a.externalDataReference > b.externalDataReference) return 1;
    return 0;
}

function formatStudents(students) {
    var formattedStudents = students.map(function (currVal, formattedStudents) {
        var tStudent = {};
        tStudent = {
            id: "",
            firstName: currVal.PreferredName,
            email: currVal.Email,
            externalDataReference: currVal.UniqueID,
            embeddedData: {
                major: currVal.Major,
                section: currVal.Section,
                pathway: currVal.Pathway,
                department: currVal.Department,
                course: currVal.Course,
                gender: currVal.Gender,
                classification: currVal.Classification,
                historicalAge: currVal.HistoricalAge,
                sessionOrder: currVal.SessionOrder,
                username: currVal.Username,
                state: currVal.State,
                subprogram: currVal.Subprogram,
                countryOnline: currVal.CountryOnline,
                semester: currVal.Semester,
                block: currVal.Block
            }
        };
        return tStudent;
    });

    // filters out empty embedded data values
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

function setOptions(student, cb) {
    //    console.log(list);
    var option = "",
        id = '';
    switch (student.action) {
        case 'Add':
            student.externalDataRef = student.externalDataReference;
            delete student.externalDataReference;
            delete student.action;

            var option = os.add(student);
            break;
        case 'Update':
            var id = student.id;
            delete student.id;
            delete student.action;

            var option = os.update(id, student);
            break;
        case 'Delete':
            delete student.action;
            var option = os.delete(student.id);
            break;
    }
    ss.send(option);
    cb();
    /*,function (pass) {
        if (pass)
            count++;
        console.log(count);
    });
    });
    console.log(count);
    if (count)
        console.log('Sussessful ' + type + "'s: " + count);*/
}

function processTheData(students, qStudents) {
    var toAdd = [],
        toUpdate = [],
        toAlter = [];

    students.forEach(function (student) {
        var qIndex,
            id;

        // get the index of matching students
        qIndex = bs(qStudents, student, sortList);

        //perform magic decision making logic
        if (qIndex > -1) {
            //  index will throw off equality if not removed temporarily
            id = qStudents[qIndex].id;
            qStudents[qIndex].id = "";
            if (!deepEqual(student, qStudents[qIndex])) {
                student.id = id;
                student.action = 'Update';
                toAlter.push(student);
                qStudents[qIndex].checked = true;
            } else {
                qStudents[qIndex].checked = true;
            }
        } else {
            delete student.id;
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


    console.log("qStudents Length:\n", qStudents.length);
    console.log('toAlter:\n', toAlter.length);
    async.mapLimit(toAlter, 20, setOptions, function (error, transformed) {
        if (error) throw new Error(error);
    });
}

function validateFile(file) {
    if (process.argv[2] == undefined) {
        console.log('Error: Must include file to sync as 2nd param');
        return false;
    } else return true;
}

function init() {
    if (!validateFile()) return;
    // get students from the tsv file
    ss.readStudents(function (students) {

        // remove any empty rows
        students = students.filter(function (student) {
            return !(student.UniqueID == '')
        });

        // format tsv student object for qualtrics
        students = formatStudents(students);
        students.sort(sortList);

        // get students from qualtrics
        ss.pullStudents(os.get(), function (qStudents) {
            //remove attributes not existant in tsv for equality check
            for (var i = 0; i < qStudents.length; i++) {
                delete qStudents[i].language;
                delete qStudents[i].unsubscribed;
                delete qStudents[i].emailHistory;
                delete qStudents[i].responseHistory;
                delete qStudents[i].lastName;
            }
            qStudents.sort(sortList);
            processTheData(students, qStudents);
        });
    });
}

init();
