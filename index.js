/* eslint-env node */
/* eslint no-console:0 */

'use strict';
const deepEqual = require('deep-equal'),
    objFilter = require('object-filter'),
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

// get unique qualtrics ID and send to ss.deleteStudent
function deleteStudents(toTerminate) {
    if (toTerminate.length == 0) return;
    toTerminate.forEach(function (student) {
        var option = os.delete(student.id);
        ss.deleteStudent(option);
    });
}

// loop through array & call ss.addStudent
function addStudents(toAdd) {
    if (toAdd.length == 0) return;
    toAdd.forEach(function (student) {
        //make externalDataReference externalDataRef
        student.externalDataRef = student.externalDataReference;
        delete student.externalDataReference;

        // format for api
        var option = os.add(student);
        // send api call
        ss.addStudent(option);
    });
}

function updateStudents(toUpdate) {
    if (toUpdate.length == 0) return;

    toUpdate.forEach(function (student) {
        var id = student.id;
        delete student.id;
        // format for api
        var option = os.update(id, student);
        // send api call
        ss.updateStudent(option);
    });
}

function processTheData(students, qStudents) {
    var toAdd = [],
        toUpdate = [];

    students.forEach(function (student, studentI) {
        var qIndex,
            id;
        // find index of matching Qualtrics Student
        for (var i = 0; i < qStudents.length; i++) {
            if (qStudents[i].externalDataReference == student.externalDataReference) {
                qIndex = i;
                break;
            }
        }
        //perform magic decision making logic
        if (qIndex > -1) {
            //  index will throw off equality if not removed temporarily
            id = qStudents[qIndex].id;
            qStudents[qIndex].id = "";
            if (!deepEqual(student, qStudents[qIndex])) {
                student.id = id;
                toUpdate.push(student);
                qStudents[qIndex].checked = true;
            } else {
                qStudents[qIndex].checked = true;
            }
        } else {
            delete student.id;
            toAdd.push(student);
        }

    });

    // exists in qualtrics but not in master file
    var toTerminate = qStudents.filter(function (qStudents) {
        return !qStudents.checked;
    });

    /*console.log("toAdd:\n", toAdd.length);
    console.log("toUpdate:\n", toUpdate.length);
    console.log("To Terminate:\n", toTerminate.length);*/

    updateStudents(toUpdate);
    deleteStudents(toTerminate);
    addStudents(toAdd);
}

function init() {

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
