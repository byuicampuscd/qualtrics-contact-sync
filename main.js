/* eslint-env node */
/* eslint no-console:0 */

'use strict';
const StudentSnatcher = require('./studentSnatcher.js'),
    optionSnatcher = require('./optionSnatcher.js'),
    bs = require('binarysearch'),
    ss = new StudentSnatcher(),
    os = new optionSnatcher();

function sortList(a, b) {
    if (a.externalDataReference < b.externalDataReference) return -1;
    if (a.externalDataReference > b.externalDataReference) return 1;
    return 0;
}

function formatStudents(students) {
    var fStudents = students.map(function (currVal, fStudents) {
        var tStudent = {};
        tStudent = {
            firstName: currVal.PreferredName,
            email: currVal.Email,
            externalDataRef: currVal.UniqueID,
            embeddedData: {
                sessionOrder: currVal.SessionOrder,
                username: currVal.Username,
                semester: currVal.Semester,
                course: currVal.Course,
                section: currVal.Section,
                subprogram: currVal.Subprogram,
                department: currVal.Department,
                pathway: currVal.Pathway,
                block: currVal.Block,
                gender: currVal.Gender,
                countryOnline: currVal.CountryOnline,
                state: currVal.State,
                classification: currVal.Classification,
                historicalAge: currVal.HistoricalAge,
                major: currVal.Major
            }
        };
        return tStudent;
    });
    return fStudents;
}

function init() {

    // get students from the tsv file
    ss.readStudents(function (students) {
        // format tsv student object for qualtrics
        students = formatStudents(students);
        students.sort(sortList);

        // get students from qualtrics
        ss.pullStudents(os.get(), function (qStudents) {

            //            console.log("FROM QUALTRICS\n");
            //            console.log(qStudents);
            qStudents.sort(sortList);
            processTheData(students, qStudents);
        });
    });
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
        indexes = [],
        toUpdate = [];

    students.forEach(function (student, studentI) {
        var qStudentI;
        for (var i = 0; i < qStudents.length; i++) {
            if (qStudents[i].externalDataRef == student.externalDataRef) {
                qStudentI = i;
                break;
            }
        }

        console.log(qStudentI);
        //        console.log('student:\n', student, '\nqStudent:\n', qStudents[qStudentI]);


        //if exists in qualtrics AND students are not the same
        if (qStudentI > -1 && !Object.is(student, qStudents[qStudentI])) {
            student.id = qStudents[qStudentI].id;
            toUpdate.push(student);
            qStudents[qStudentI].checked = true;
            //if exists AND is the same
        } else if (qStudentI > -1 && Object.is(student, qStudents[qStudentI])) {
            qStudents[qStudentI].checked = true;
            //if doesn't exist in qualtrics
        } else {
            toAdd.push(student);
        }
    });

    console.log("toAdd", toAdd.length);
    console.log("\ntoUpdate\n", toUpdate.length);
    //    console.log("\nqstudents", qStudents);

    // exists in qualtrics but not in file to be synked
    var toTerminate = qStudents.filter(function (qStudents) {
        return !qStudents.checked;
    });
    console.log("\nTo Terminate\n", toTerminate.length);

    //    updateStudents(toUpdate);
    //    deleteStudents(toTerminate);
    //    addStudents(toAdd);

}

init();
