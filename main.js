/* eslint-env node */
/* eslint no-console:0 */

'use strict';
const StudentSnatcher = require('./import.js'),
    options = require('./options.js'),
    bs = require('binarysearch'),
    ss = new StudentSnatcher();

function sortList(a, b) {
    if (a.externalDataReference < b.externalDataReference) return -1;
    if (a.externalDataReference > b.externalDataReference) return 1;
    return 0;
}

function formatStudents(students) {
    var fStudents = students.map(function (currVal, fStudents) {
        var tStudent = {};
        tStudent = {
            id: "",
            firstName: currVal.PreferredName,
            email: currVal.Email,
            externalDataReference: currVal.UniqueID,
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
    ss.getStudents(function (students) {
        // format tsv student object for qualtrics
        students = formatStudents(students);
        students.sort(sortList);

        //        console.log("FROM LIST\n");
        //        console.log(students);

        // get students from qualtrics
        ss.pullStudents(options[1], function (qStudents) {

            //            console.log("FROM QUALTRICS\n");
            //            console.log(qStudents);
            qStudents.sort(sortList);
            processTheData(students, qStudents);
        });
    });
}

function deleteStudents(toTerminate) {
    // get unique qualtrics ID and send to ss.deleteStudent
}

function addStudent(toAdd) {
    // loop through array & call ss.addStudent
}

function updateStudent() {
    // get unique qualtrics ID & send to ss.updateStudent
}

function processTheData(students, qStudents) {
    var toAdd = [],
        toUpdate = [];


    // array containing unique id of all qualtrics students
    /*var qSIndex = qStudents.map(function (currVal) {
    return currVal.externalDataReference;
});*/
    students.forEach(function (student, studentI) {
        var qStudentI = bs(qSIndex, student, function (value, find) {
            if (value.externalDataReference < find.externalDataReference) return 1;
            if (value.externalDataReference > find.externalDataReference) return -1;
            else return 0;
        });
        console.log(qStudentI);

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
        }
    });

    console.log("toAdd");
    console.log(toAdd.length);
    console.log("\ntoUpdate");
    console.log(toUpdate.length);

    console.log("\nqstudents");
    console.log(qStudents);

    // exists in qualtrics but not in file to be synked
    var toTerminate = qStudents.filter(function (qStudents) {
        return !qStudents.checked;
    });

    //    deleteStudents(toTerminate);
    console.log("To Terminate");
    console.log(toTerminate.length);

}

init();
