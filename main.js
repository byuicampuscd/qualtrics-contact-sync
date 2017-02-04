/* eslint-env node */
/* eslint no-console:0 */

'use strict';
const StudentSnatcher = require('./import.js'),
    options = require('./options.js'),
    bs = require('binarysearch'),
    ss = new StudentSnatcher();

function sortList(a, b) {
    if (a.criteria < b.criteria) return -1;
    if (a.criteria > b.criteria) return 1;
    return 0;
}

function init() {
    // get students from the tsv file
    ss.getStudents(function (students) {
        students.sort(sortList);

        //console.log("FROM LIST\n");
        //console.log(students);

        // get students from qualtrics
        ss.pullStudents(options[1], function (qStudents) {

            //console.log("FROM QUALTRICS\n");
            //console.log(qStudents);
            qStudents.sort(sortList);
            processTheData(students, qStudents);
        });
    });
}

function deleteStudents(toTerminate) {
    //get unique qualtrics ID and send to deleteStudent
}

function processTheData(students, qStudents) {
    var toAdd = [],
        toUpdate = [];

    students.forEach(function (student, studentI) {
        var qStudentI = bs(qStudents, student, function (value, find) {
            if (value.externalDataReference < find.UniqueID) return 1;
            else if (value.externalDataReference > find.UniqueID) return -1;
            else return 0;
        });
        //if exists in qualtrics AND students are not the same
        if (qStudentI > -1 && !Object.is(student, qStudents[qStudentI])) {
            toUpdate.push(student);
            qStudents[qStudentI].checked = true;

            //if exists AND is the same
        } else if (qStudentI > -1 && Object.is(student, qStudents[qStudentI])) {
            qStudents[qStudentI].checked = true;

            //if doesn't exist in qualtrics
        } else {
            toAdd.push(student);
            qStudents[qStudentI].checked = true;
        }
    });

    console.log("toAdd");
    console.log(toAdd);
//    console.log("\ntoUpdate");
//    console.log(toUpdate);

    console.log("\nqstudents");
    console.log(qStudents);

    // exists in qualtrics but not in file to be synked
    var toTerminate = qStudents.filter(function () {
        return qStudents.checked;
        deleteStudents(toTerminate);
    });




    /*var tempStudentList = [],
    tempStudent = {};
for (var i = 0; i < students.length; i++) {
    tempStudent = JSON.stringify({
        firstName: students[i].PreferredName,
        email: students[i].Email,
        externalDataReference: students[i].UniqueID,
        embeddedData: {
            sessionOrder: students[i].SessionOrder,
            username: students[i].Username,
            semester: students[i].Semester,
            course: students[i].Course,
            section: students[i].Section,
            subprogram: students[i].Subprogram,
            department: students[i].Department,
            pathway: students[i].Pathway,
            block: students[i].Block,
            gender: students[i].Gender,
            countryOnline: students[i].CountryOnline,
            state: students[i].State,
            classification: students[i].Classification,
            historicalAge: students[i].HistoricalAge,
            major: students[i].Major
        }
    });
    ss.addStudent(options[2], tempStudent);
    tempStudentList.push(tempStudent);*/
    //        console.log(JSON.stringify(tempStudent));
}

init();
