/* eslint no-console:1 */

const asyncLib = require('async');
const binarySearch = require('binary-search');
const chalk = require('chalk');
const qualtrics = require('./qualtrics.js');

/* Handles the comparison of contacts in the tool */

function compareContacts(csvFile, waterfallCb) {
    if (csvFile.report.matchingHash === true) {
        waterfallCb(null, csvFile);
        return;
    }
    // console.log('compareContacts called');
    console.log(chalk.magenta('Comparing Contacts'));


    /* Loop through csvStudents */
    csvFile.csvContacts.forEach(contact => {
        /* binary search -> find contacts with matching externalDataReferences*/
        var qIndex = binarySearch(csvFile.qualtricsContacts, contact, sortList);

        if (qIndex == -1) {
            /* if there is no match */
            csvFile.report.toAdd.push(contact);
        } else {
            /* determine if the contact needs to be updated */
            /* save a copy of the qualtrics Contact for quick reference */
            var qContact = csvFile.qualtricsContacts[qIndex];

            /* remove qContact from master list to determine which contacts need to be deleted */
            csvFile.qualtricsContacts.splice(qIndex, 1);

            /* equality comparison */
            var cKeys = Object.keys(contact),
                qKeys = Object.keys(qContact),
                keysToIgnore = ['language', 'unsubscribed', 'responseHistory', 'emailHistory'],
                equal = true;

            /* check if csvContact is equal to qualtricsContact */
            /* Loop through cKeys first -> cleaner logic with the same chance of finding a diff */
            equal = cKeys.every(cKey => {
                /* check if key exists in both contacts && check that values are the same */
                if (qKeys.includes(cKey) && contact[cKey] === qContact[cKey]) {
                    // DOESN'T CHECK EMBEDDEDDATA OBJECT AT ALL!
                    return true;
                } else {
                    return false;
                }
            });

            /* If equal then run the other comparison. */
            if (equal) {
            } 
            
            if(!equal) {
                csvFile.report.toUpdate.push(contact);
            }
        }
    });



    // ENSURE KEYS ARE NOT CASE SENSITIVE ON COMPARE
    // HOW DOES API LIKE BOOL VALUES IN EMBEDDED DATA?? (do they become strings?)
    // missing required fields (for add). no influence over equality comparison

    // capitalization -> compare keys in lowercase
    // qualtrics generated fields -> array of keys to ignore
    // empty strings -> same as normal comparison
    // required fields in embeddedData -> if exists in qualtrics only && value is ''

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
 * removes commas & replaces UniqueID with externalDataRef
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
                    /* make the first character lower case. For equality comparison 
                    & compliance to qualtrics format */
                    tempContact[key.charAt(0).toLowerCase()] = contact[key];
                } else {
                    /* remove commas from embeddedData so Qualtrics won't truncate the value */
                    tempContact.embeddedData[key] = contact[key].replace(/,/g, '');
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