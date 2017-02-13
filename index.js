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
    var option = "";
    switch (student.action) {
        case 'Add':
            var option = os.add(student); //map or filter the student object (inside of object snatcher)
            break;
        case 'Update':
            var option = os.update(student);
            break;
        case 'Delete':
            var option = os.delete(student.id);
            break;
    }
    ss.send(student, option, cb);
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

    //    console.log("qStudents Length:\n", qStudents.length);
    console.log('Changes to be made:\n', toAlter.length);

    //make api calls 20 at a time
    async.mapLimit(toAlter, 30, setOptions, function (error, students) {
        if (error) throw new Error(error);
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
            console.log("Students successfully added: " + aCount);
        if (uCount)
            console.log("Students successfully updated: " + uCount);
        if (dCount)
            console.log("Students successfully deleted: " + dCount);

        failed.forEach(function (student) {
            console.log("Failed to " +
                student.action + " student: " + student.uniqueID, "Error: " + student.errorMessage);
        });
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
        ss.pullStudents(os.get(), function (error, qStudents) {
            if (error)
                throw new Error(error);
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
