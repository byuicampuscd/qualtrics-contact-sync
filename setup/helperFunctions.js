/* eslint no-console:0 */
const request = require('request');
const token = require('../auth.json').token;
const qualtrics = require('../qualtrics.js');
const asyncLib = require('async');
const fs = require('fs');

const domain = 'byui.az1.qualtrics.com';
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

function getMailingListsByName(name) {
    var requestObj = {
        method: 'GET',
        url: `https://${domain}/API/v3/mailinglists`,
        headers: {
            'x-api-token': token
        }
    };

    request(requestObj, (err, response, body) => {
        if (err) {
            console.error(err);
            return;
        }
        body = JSON.parse(body);

        var names = body.result.elements.map(list => {
            return {
                name: list.name,
                id: list.id
            };
        });

        console.log(names);
        // console.log(JSON.stringify(body, null, 3));
        // console.log(body.result.elements);
        var derp = body.result.elements.filter(list => {
            return list.name === name;
        });

        // console.log(derp);
    });
}

function deleteMailingListByID(mlId) {
    var obj = {
        method: 'DELETE',
        url: `https://${domain}/API/v3/mailinglists/${mlId}`,
        headers: {
            'x-api-token': token
        }
    };

    request(obj, (err, response, body) => {
        if (err) {
            console.error(err);
            return;
        }
        body = JSON.parse(body);

        console.log(body);
    });
}

function createMailingLists(libraryID) {
    function createList(listTitle, cb) {
        var body = {
            libraryId: libraryID,
            name: listTitle
        };
        var settings = {
            method: 'POST',
            url: `https://${domain}/API/v3/mailinglists`,
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

    asyncLib.mapLimit(listTitles, 5, createList, (err, mailingLists) => {
        if (err) console.error(err);
        else {
            console.log(mailingLists);
        }
    });
}

function getContactsInML(mailingListID, contactUniqueID) {
    qualtrics.changeUser(token);

    qualtrics.getContacts({
        config: {
            MailingListID: mailingListID
        }
    }, (err, contacts) => {
        if (err) {
            console.error(err);
            return;
        }
        // var contact = contacts.filter(contact => contact.externalDataReference === contactUniqueID);
        // console.log(JSON.stringify(contact, null, 3));
        // console.log(JSON.stringify(contacs, null, 3));\
        fs.writeFileSync('./contacts.json', JSON.stringify(contacts, null, 3));
    });
}


getMailingListsByName(''); // mailing list name
// deleteMailingListByID(); // mailingListID 
// createMailingLists('UR_42uqfMT52qGeZ7f'); // libraryID
// getContactsInML('ML_erm3lDvbUMMeopD', null);
// getContactByUniqueID(); // mailingListID, UniqueID of contact