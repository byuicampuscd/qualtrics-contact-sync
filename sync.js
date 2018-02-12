/* eslint no-console:1 */

const qualtrics = require('./qualtrics.js');
const asyncLib = require('async');

/* Handles the comparison of contacts in the tool */

/*********************************************
 * IDK if this should be a helper or not...
 ********************************************/
function sortContacts(csvFile, waterfallCb) {
    console.log('Sort Contacts called');
    
    waterfallCb(null, csvFile);
}


/*********************************************
 * get students from qualtrics API
 * 
 *********************************************/
function pullContacts(csvFile, waterfallCb) {
    qualtrics.getContacts(csvFile, (getErr, contacts) => {
        if(getErr) {
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
    var requiredKeys = ['Email', 'UniqueID', 'FirstName', 'LastName'],
        tempContact = {};

    csvFile.csvContacts = csvFile.csvContacts.reduce((contactList, contact) => {
        /* Dont save the contact if they don't have a uniqueID */
        if (contact.UniqueID && contact.UniqueID != '') {
            tempContact = {
                embeddedData: {}
            };

            /* save property to correct location */
            Object.keys(contact).forEach(key => {
                if (requiredKeys.includes(key)) {
                    tempContact[key] = contact[key];
                } else {
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


module.exports = [
    formatCsvContacts,
    asyncLib.retryable(2, pullContacts),
    sortContacts,
];