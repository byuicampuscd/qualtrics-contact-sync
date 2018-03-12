/* eslint no-console:0 */
const qualtrics = require('../qualtrics.js');
const asyncLib = require('async');
const token = require('').token;

const libraryID = '';
const listTitles = [
    'AdmittedOnlineStudents',
    'CertificatesAwardedPriorSem',
    'CourseVisit1',
    'CourseVisit2',
    'CurrentOnlineInstructorsFirstHalf',
    'CurrentOnlineInstructorsSecondHalf',
    'CurrentStudentEnrollments',
    'CurrentStudents',
    'OnlineAIMs',
    'OnlineCLCourses',
    'OnlineCLs',
    'OnlineInstructorCourses',
    'OnlineInstructors',
    'OnlineOCRCourses',
    'OnlineOCRs',
    'OnlineTGLs',
];

function createList(listTitle, cb) {
    var body = {
        libraryId: libraryID,
        name: listTitle
    };
    var settings = {
        method: 'POST',
        url: 'https://DOMAIN.com/API/v3/mailinglists',
        body: JSON.stringify(body),
        headers: {
            'x-api-token': token,
            'content-type': 'application/json'
        }
    };
    qualtrics.request(settings, (err, mlID) => {
        if (err) cb(err, mlID);
        else {
            cb(null, {
                name: listTitle,
                id: mlID.result.id
            });
        }
    });
}

function loopTitles() {
    asyncLib.mapLimit(listTitles, 5, createList, (err, mailingLists) => {
        if (err) console.error(err);
        else {
            console.log(mailingLists);
        }
    });
}

loopTitles();
