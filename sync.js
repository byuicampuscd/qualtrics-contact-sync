/* eslint no-console:0 */

const asyncLib = require('async');
const binarySearch = require('binarysearch');
const chalk = require('chalk');
const qualtrics = require('./qualtrics.js');

/* qualtrics generated keys that the csv will not have */
const keysToIgnore = ['language', 'unsubscribed', 'responseHistory', 'emailHistory', 'id'];



/**************************************************
 * Abstraction of add, update, & delete api calls
 * Good Luck!
 *************************************************/
function makeApiCalls(csvFile, waterfallCb) {
    if (csvFile.report.matchingHash === true) {
        waterfallCb(null, csvFile);
        return;
    }

    const apiActions = [{
        name: 'Add',
        apiCall: qualtrics.addContact,
        location: csvFile.report.toAdd,
    },
    {
        name: 'Update',
        apiCall: qualtrics.updateContact,
        location: csvFile.report.toUpdate,
    },
    {
        name: 'Delete',
        apiCall: qualtrics.deleteContact,
        location: csvFile.report.toDelete,
    }
    ];

    /* loop through each action type (add, update, delete) */
    asyncLib.eachSeries(apiActions, runAction, (err) => {
        if (err) {
            waterfallCb(err, csvFile);
            return;
        }
        waterfallCb(null, csvFile);
    });

    /* loop through all contacts in an action */
    function runAction(action, seriesCb) {
        asyncLib.eachLimit(action.location, 5, wrapRetry, (err) => {
            if (err) {
                seriesCb(err);
                return;
            }
            console.log(`${action.name} - Completed: ${action.location.length}`);
            seriesCb(null);
        });

        /* wrap the call in an asyncRetry. In case of a 500 server err (happens often) */
        function wrapRetry(contact, eachCb) {
            asyncLib.retry(2, makeCall, (err) => {
                if (err) {
                    /* if contact failed, record it & move on */
                    contact.err = err;
                    contactFailed(csvFile, contact, action.name);
                }
                eachCb(null);
            });

            /* Allows csvFile & contact to be passed to qualtrics.js while still using asyncRetry */
            function makeCall(retryCb) {
                action.apiCall(csvFile, contact, (err, response) => {
                    if (err) {
                        /* pass err to retry so it can try again */
                        retryCb(err);
                    }
                    retryCb(null);
                });
            }
        }
    }
}

/****************************************************
 * Performs necessary tweaking of the contact objects
 * before adding them to qualtrics.
 * Changes externalDataReference to externalDataRef
 * Removes keys with empty string values
 * Removes contacts who are missing required fields
 ****************************************************/
function addPrep(csvFile, waterfallCb) {
    if (csvFile.report.matchingHash === true) {
        waterfallCb(null, csvFile);
        return;
    }

    csvFile.report.toAdd = csvFile.report.toAdd.filter(contact => {
        /* convert externalDataReference to externalDataRef */
        contact.externalDataRef = contact.externalDataReference;
        delete contact.externalDataReference;

        /* Check for missing required fields */
        var hasRequiredFields = Object.keys(contact).every(key => {
            return contact[key] !== '';
        });

        /* Don't add contacts missing required fields */
        if (!hasRequiredFields) {
            contact.action = 'Add';
            contact.err = new Error('Contact missing required field');
            csvFile.report.failed.push(contact);
            return false;
        }

        /* Remove embeddedData propterties with empty string values (else api will throw err) */
        Object.keys(contact.embeddedData).forEach(key => {
            if (contact.embeddedData[key] === '') {
                delete contact.embeddedData[key] === '';
            }
        });
        /* keep the file when complete */
        return true;
    });
    waterfallCb(null, csvFile);
}


/*****************************************************
 * a pretty little report at the half-way point
 ****************************************************/
function report(csvFile, waterfallCb) {
    if (csvFile.report.matchingHash === true) {
        waterfallCb(null, csvFile);
        return;
    }

    var addCount = csvFile.report.toAdd.length,
        updateCount = csvFile.report.toUpdate.length,
        deleteCount = csvFile.report.toDelete.length;

    console.log(`Changes to Make: ${addCount + updateCount + deleteCount}`);
    /* console.log(`toAdd: ${addCount}`);
    console.log(`toUpdate: ${updateCount}`);
    console.log(`toDelete: ${deleteCount}`); */

    waterfallCb(null, csvFile);
}


/**********************************************************
 * Determines which contacts need to be added, 
 * updated, deleted, and left unchanged.
 * Calls equalityComparison to determine if existing
 * contacts have changed
 *********************************************************/
function compareContacts(csvFile, waterfallCb) {
    if (csvFile.report.matchingHash === true) {
        waterfallCb(null, csvFile);
        return;
    }
    console.log(chalk.magenta('Comparing Contacts'));

    /* Loop through csvStudents */
    csvFile.csvContacts.forEach(contact => {
        /* binary search -> find contacts with matching externalDataReferences*/
        var qIndex = binarySearch(csvFile.qualtricsContacts, contact, sortList);

        if (qIndex == -1) {
            /* if there is no match */
            csvFile.report.toAdd.push(contact);
        } else {
            equalityComparison(csvFile, contact, csvFile.qualtricsContacts[qIndex]);
            /* remove qContact from master list to determine which contacts need to be deleted */
            csvFile.qualtricsContacts.splice(qIndex, 1);
        }
    });
    /* whatever didn't have a match in the binary search gets deleted */
    csvFile.report.toDelete = [...csvFile.qualtricsContacts];

    waterfallCb(null, csvFile);
}


/*********************************************
 * Call sortList() helper for both CSV lists
 ********************************************/
function sortContacts(csvFile, waterfallCb) {
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

    console.log(chalk.magenta('Pulling contacts from Qualtrics'));
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
                    tempContact[key.charAt(0).toLowerCase() + key.slice(1)] = contact[key];
                } else {
                    /* remove commas from embeddedData so Qualtrics won't truncate the value */
                    tempContact.embeddedData[key] = contact[key].replace(/,/g, '');
                }
            });

            /* delete embedded data if it's empty */
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


// ENSURE KEYS ARE NOT CASE SENSITIVE ON COMPARE
// HOW DOES API LIKE BOOL VALUES IN EMBEDDED DATA?? (do they become strings?)
// missing required fields (for add). no influence over equality comparison

// capitalization -> compare keys in lowercase
// qualtrics generated fields -> array of keys to ignore
// empty strings -> same as normal comparison
// required fields in embeddedData -> if exists in qualtrics only && value is ''


/*******************************************************
 * Equality comparison between two contacts. 
 *******************************************************/
function equalityComparison(csvFile, contact, qContact) {

    /* OUTER OBJECT */
    /* Filter out keys with empty values */
    var cKeys = Object.keys(contact).filter(key => {
            return contact[key] != '' && key != 'embeddedData';
        }),
        /* Filter out qualtrics specific keys */
        qKeys = Object.keys(qContact).filter(key => {
            return !keysToIgnore.includes(key) && key != 'embeddedData';
        }),
        equal = true;

    /* Compare outer object - only runs once because we know the keys are the same */
    equal = cKeys.every(cKey => {
        return qKeys.includes(cKey) && contact[cKey] === qContact[cKey];
    });


    /* EMBEDDED DATA */
    /* Must loop through the keys of both objects or it won't catch keys which need to be deleted (cleared) */

    /* Compare contact to qContact */
    if (equal) {
        equal = checkEmbeddedData(contact, qContact);
    }
    /* Compare qContact to contact */
    if (equal) {
        equal = checkEmbeddedData(qContact, contact);
    }

    /* if any of the checks found inequalities -> update contact */
    if (!equal) {
        /* save id to contact so it can be updated */
        contact.id = qContact.id;
        csvFile.report.toUpdate.push(contact);
    }
}

/**************************************************
 * Logic for comparing embeddedData. Returns true
 * if the contact's embeddedData object is the same
 **************************************************/
function checkEmbeddedData(contact1, contact2) {
    var emKeys1 = Object.keys(contact1.embeddedData),
        emKeys2 = Object.keys(contact2.embeddedData);

    return emKeys1.every(key => {
        /* TRUE IF (key exists in both contacts & value is the same) OR (key exists only on current contact but value is '') */
        return ((emKeys2.includes(key) && contact1.embeddedData[key] === contact2.embeddedData[key]) ||
            (!emKeys2.includes(key) && contact1.embeddedData[key] === ''));
    });
}

/********************************************
 * sort any list by externalDataRef property
 ********************************************/
function sortList(a, b) {
    if (a.externalDataReference < b.externalDataReference) return -1;
    if (a.externalDataReference > b.externalDataReference) return 1;
    return 0;
}

/*********************************************
 * Remove contact from appropriate action list 
 * & add to failed contact list
 *********************************************/
function contactFailed(csvFile, contact, action) {
    /* save action so we know what they were suppsed to do */
    contact.action = action;

    /* add them to the list of failed students */
    csvFile.report.failed.push(contact);
    /* remove them from the successful students */
    csvFile.report[`to${action}`].splice(csvFile.csvContacts.indexOf(contact), 1);
}

/***********************************************************
 *                END HELPER FUNCTIONS 
 **********************************************************/

module.exports = [
    formatCsvContacts, /* make them look like qualtrics contacts */
    asyncLib.retryable(2, pullContacts), /* make 2 attempts at pullContacts() */
    sortContacts, /* sort by externalReferenceId */
    compareContacts,
    report,
    addPrep, /* filters & prepares the contacts who need to be added */
    makeApiCalls,
];