/* eslint no-console:1 */

const qualtrics = require('./qualtrics.js');
const asyncLib = require('async');

/* Handles the comparison of contacts in the tool */

function compareContacts(csvFile, waterfallCb) {
    if (csvFile.report.matchingHash === true) {
        waterfallCb(null, csvFile);
        return;
    }
    console.log('compareContacts called');
    
    // ENSURE KEYS ARE NOT CASE SENSITIVE ON COMPARE
    // HOW DOES API LIKE BOOL VALUES IN EMBEDDED DATA??
    
    waterfallCb(null, csvFile);
}



/*********************************************
 * Call sortList() helper for both CSV lists
 ********************************************/
function sortContacts(csvFile, waterfallCb) {
    console.log('Sort Contacts called');

    if (csvFile.report.matchingHash === true) {
        waterfallCb(null, csvFile);
        return;
    }

    /* Sort both lists by externalDataRef for binary search */
    csvFile.csvContacts.sort(sortList);
    csvFile.qualtricsContacts.sort(sortList);

    waterfallCb(null, csvFile);
}


/*****************************************************
 * get students from qualtrics API. Calls Qualtrics.js
 * getAllContacts function. wrapped in an asyncRetryable 
 * in the waterfall to make a second attempt if needed
 *****************************************************/
function pullContacts(csvFile, waterfallCb) {
    if (csvFile.report.matchingHash === true) {
        waterfallCb(null, csvFile);
        return;
    }

    qualtrics.getContacts(csvFile, (getErr, contacts) => {
        if (getErr) {
            /* fatal err if students cannot be pulled */
            waterfallCb(getErr, csvFile);
            return;
        }
        /* set contacts to csvFile object */
        csvFile.qualtricsContacts = contacts;
        waterfallCb(null, csvFile);
    });
}

/********************************************************
 * Removes contacts that don't have a uniqueId property
 * Formats the remaining contacts to fit Qualtrics API
 ********************************************************/
function formatCsvContacts(csvFile, waterfallCb) {
    if (csvFile.report.matchingHash === true) {
        waterfallCb(null, csvFile);
        return;
    }

    var requiredKeys = ['Email', 'FirstName', 'LastName'],
        tempContact = {};

    csvFile.csvContacts = csvFile.csvContacts.reduce((contactList, contact) => {
        /* Dont save the contact if they don't have a uniqueID */
        if (contact.UniqueID && contact.UniqueID != '') {
            tempContact = {
                embeddedData: {}
            };

            /* save property to correct location. Replace UniqueID with externalDataReference */
            Object.keys(contact).forEach(key => {
                if (key === 'UniqueID') {
                    tempContact.externalDataReference = contact[key];
                } else if (requiredKeys.includes(key)) {
                    tempContact[key] = contact[key];
                }  else {
                    tempContact.embeddedData[key] = contact[key];
                }
            });

            /* delete empty data if it's empty */
            if (tempContact.embeddedData.length == 0) {
                delete tempContact.embeddedData;
            }

            contactList.push(tempContact);
        }
        return contactList;
    }, []);

    waterfallCb(null, csvFile);
}

/***********************************************************
 *                 HELPER FUNCTIONS 
 **********************************************************/

/********************************************
  * sort any list by externalDataRef property
  ********************************************/
function sortList(a, b) {
    if (a.externalDataReference < b.externalDataReference) return -1;
    if (a.externalDataReference > b.externalDataReference) return 1;
    return 0;
}

/***********************************************************
 *                END HELPER FUNCTIONS 
 **********************************************************/

module.exports = [
    formatCsvContacts, // make them look like qualtrics contacts
    asyncLib.retryable(2, pullContacts), // make 2 attempts at pullContacts()
    sortContacts, // sort by externalReferenceId
    compareContacts,
];
