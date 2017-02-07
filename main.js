/* eslint-env node */
/* eslint no-console:0 */

'use strict';
const StudentSnatcher = require('./import.js'),
    optionSnatcher = require('./getOptions.js'),
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

        // get mailing list???
        // get students from qualtrics
        ss.pullStudents(os.get(), function (qStudents) {

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

function addStudents(toAdd) {
    // loop through array & call ss.addStudent
}

function updateStudents(toUpdate) {
    // set options & send to ss.updateStudent
    toUpdate.forEach(function (student) {
        if (!student) {
            return;
        }

        console.log(student);

        var option
            //        ss.updateStudent(option, student);
    })
}

function processTheData(students, qStudents) {
    var toAdd = [],
        indexes = [],
        toUpdate = [];

    students.forEach(function (student, studentI) {
        var qStudentI;
        for (var i = 0; i < qStudents.length; i++) {
            if (qStudents[i].externalDataReference == student.externalDataReference) {
                qStudentI = i;
                break;
            }
        }

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

    //    console.log("toAdd", toAdd.length);
    //    console.log("\ntoUpdate\n", toUpdate);
    //    console.log("\nqstudents", qStudents);

    // exists in qualtrics but not in file to be synked
    var toTerminate = qStudents.filter(function (qStudents) {
        return !qStudents.checked;
    });
    //    console.log("\nTo Terminate\n", toTerminate);

    updateStudents(toUpdate);
    deleteStudents(toTerminate);
    addStudents(toAdd);

}

init();
