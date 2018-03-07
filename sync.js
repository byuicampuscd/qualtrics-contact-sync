/* eslint no-console:0 */

const asyncLib = require('async');
const binarySearch = require('binarysearch');
const chalk = require('chalk');
const qualtrics = require('./qualtrics.js');

/* qualtrics generated keys that the csv will not have */
const keysToIgnore = ['language', 'unsubscribed', 'responseHistory', 'emailHistory', 'id'];
// TODO add pull tries as global
// TODO magic numbers as consts

/**************************************************
 * Abstraction of add, update, & delete api calls
 * Good Luck!
 *************************************************/
function makeApiCalls(csvFile, waterfallCb) {
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
        var changesMade = 0;

        asyncLib.eachLimit(action.location, 5, wrapRetry, (err) => {
            if (err) {
                seriesCb(err);
                return;
            }
            /* newline after printing num changes being made */
            if (action.location.length > 0)
                process.stdout.write('\n');

            seriesCb(null);
        });

        /* wrap the call in an asyncRetry. In case of a 500 server err (happens often) */
        function wrapRetry(contact, limitCb) {
            asyncLib.retry({
                times: 3,
                interval: 3000
            }, makeCall, (err) => {
                if (err) {
                    /* if contact failed, record it & move on */
                    process.stdout.clearLine(); // hopefully these keep the logging methods from breaking
                    process.stdout.cursorTo(0);
                    contactFailed(csvFile, contact, action.name, err);
                }
                /* write num actions completed on 1 line */
                process.stdout.clearLine();
                process.stdout.cursorTo(0);
                process.stdout.write(`${action.name} - Completed: ${changesMade}`);
                limitCb(null);
            });

            /* Allows csvFile & contact to be passed to qualtrics.js while still using asyncRetry */
            function makeCall(retryCb) {
                action.apiCall(csvFile, contact, (err) => {
                    if (err) {
                        /* pass err to retry so it can try again */
                        retryCb(err);
                        return;
                    }
                    changesMade++;
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
    csvFile.report.toAdd = csvFile.report.toAdd.filter(contact => {
        /* Check for missing required fields */
        var hasRequiredFields = !Object.values(contact).includes('');

        /* Don't add contacts missing required fields */
        if (!hasRequiredFields) {
            contactFailed(csvFile, contact, 'Add', new Error('Contact missing required field'));
            return false;
        }

        /* convert externalDataReference to externalDataRef (required by API to add contact) */
        contact.externalDataRef = contact.externalDataReference;
        delete contact.externalDataReference;

        /* Remove embeddedData properties with empty string values (required by API) */
        // TODO can I add a contact with an empty embeddedData value?
        Object.keys(contact.embeddedData).forEach(key => {
            if (contact.embeddedData[key] === '') {
                delete contact.embeddedData[key];
            }
        });
        /* keep the file when complete */
        return true;
    });
    waterfallCb(null, csvFile);
}


/*****************************************************
 * a pretty little report at the half-way point. Mostly
 * for debugging purposes.
 ****************************************************/
function report(csvFile, waterfallCb) {
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
    console.log(chalk.magenta('Comparing Contacts'));

    /* Loop through csvStudents */
    csvFile.csvContacts.forEach(contact => {
        /* binary search -> find contacts with matching externalDataReferences (uniqueId) */
        var qIndex = binarySearch(csvFile.qualtricsContacts, contact, sortList);

        if (qIndex == -1) {
            /* if there is no match, add the contact */
            csvFile.report.toAdd.push(contact);
        } else {
            equalityComparison(csvFile, contact, csvFile.qualtricsContacts[qIndex]);
            /* remove qContact from master list. leftover contacts need to be deleted */
            csvFile.qualtricsContacts.splice(qIndex, 1);
        }
    });
    /* whatever didn't have a match in the binary search gets deleted */
    // TODO compare remaining qualtrics contacts against failed contacts so we don't delete contacts with duplicate ID's. BEWARE OF NOT BEING ABLE TO DELETE CONTACTS
    csvFile.report.toDelete = [...csvFile.qualtricsContacts];
    // csvFile.report.toDelete = [...csvFile.qualtricsContacts].filter(qContact => {
    //     return csvFile.report.failed.some(failedContact => {
    //         return failedContact.UniqueID;
    //     });
    // });

    waterfallCb(null, csvFile);
}


/*********************************************
 * Call sortList() helper for both CSV lists
 ********************************************/
function sortContacts(csvFile, waterfallCb) {
    /* Sort both lists by externalDataRef. Required for binary search */
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

/***************************************************
 * Formats the CSV contact objects to look like a 
 * Qualtrics Contact object.
 ***************************************************/
function formatCsvContacts(csvFile, waterfallCb) {
    /* Capitalization of requiredKeys is important */
    var requiredKeys = ['Email', 'FirstName', 'LastName'],
        tempContact = {},
        ids = csvFile.csvContacts.map(contact => contact.UniqueID); // create a list of id's to compare against



    csvFile.csvContacts = csvFile.csvContacts.reduce((contactList, contact) => {
        tempContact = {
            embeddedData: {}
        };
        // TODO check for duplicate id's... no it was something else...... poop.

        /* Save property to correct location. Replace UniqueID with externalDataReference */
        Object.keys(contact).forEach(key => {
            if (key === 'UniqueID') {
                tempContact.externalDataReference = contact[key];
            } else if (requiredKeys.includes(key)) {
                /* make the first character lower case. For equality comparison 
                        & API compatibility */
                tempContact[key.charAt(0).toLowerCase() + key.slice(1)] = contact[key];
            } else {
                /* remove commas from embeddedData so Qualtrics won't truncate the value */
                tempContact.embeddedData[key] = contact[key].replace(/,/g, '');
                /* Excel turns True to TRUE, which will make the contact update */
                tempContact.embeddedData[key].replace(/^TRUE$/, 'True');
                tempContact.embeddedData[key].replace(/^FALSE$/, 'False');
            }
        });

        /* delete embedded data if it's empty */
        // TODO test this. Does qualtrics return an embeddedData OBJ when it's empty?
        //  (if yes this needs to go)
        if (tempContact.embeddedData.length == 0) {
            delete tempContact.embeddedData;
        }

        /* All contacts formatted, Add invalid contacts to failed list instead of csvContacts */
        
        /* Only keep the contact if they have a UniqueID AND the UniqueID is not a duplicate */
        if ((!contact.UniqueID || contact.UniqueID === '') || (ids.indexOf(contact.UniqueID) !== ids.lastIndexOf(contact.UniqueID))) {
            /* set externalDataReference to firstName, lastName if the contact didn't have a UniqueID */
            if (!tempContact.externalDataReference) tempContact.externalDataReference = `${tempContact.firstName}, ${tempContact.lastName}`;

            console.log(chalk.yellow(`Failed to Validate contact: ${tempContact.externalDataReference}. Please verify contact's UniqueID`));
            csvFile.report.failed.push(tempContact);
        } else {
            contactList.push(tempContact);
        }

        return contactList;
    }, []);

    waterfallCb(null, csvFile);
}

/***********************************************************
 *                 HELPER FUNCTIONS 
 **********************************************************/

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
        /* If the value is empty, add it to both contacts (so deleting embeddedData fields will work) */
        if (!emKeys2.includes(key) && contact1.embeddedData[key] != '') {
            contact2.embeddedData[key] = '';
        }

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

/*************************************************
 * Remove contact from appropriate action list 
 * & add to failed contact list. Used for contact
 * level errors
 *************************************************/
function contactFailed(csvFile, contact, action, err) {
    /* when adding contacts externalDataRef must be used instead of externalDataReference. Thank you Qualtrics */
    if (contact.externalDataRef != undefined)
        console.log(chalk.yellow(`Failed to ${action} Contact: ${contact.externalDataRef} ${err}`));
    else
        console.log(chalk.yellow(`Failed to ${action} Contact: ${contact.externalDataReference} ${err}`));

    /* save action so we know what they were supposed to do */
    contact.action = action;
    contact.err = err;

    /* add them to the list of failed students */
    csvFile.report.failed.push(contact);
    /* remove them from the successful students */
    csvFile.report[`to${action}`].splice(csvFile.csvContacts.indexOf(contact), 1);
}

/***********************************************************
 *                END HELPER FUNCTIONS 
 **********************************************************/

function startSync(csvFile, cb) {
    var waterfallFunctions = [
        asyncLib.constant(csvFile),
        formatCsvContacts, /* contact objects to match qualtrics format */
        asyncLib.retryable(2, pullContacts), /* make X attempts at pullContacts() */
        sortContacts, /* sort by externalReferenceId */
        compareContacts, /* equality comparison */
        report, /* mostly for debugging */
        addPrep, /* filters & prepares the contacts who need to be added */
        makeApiCalls, /* adds, updates, & deletes contacts */
    ];

    asyncLib.waterfall(waterfallFunctions, (err, syncedCsvFile) => {
        if (err) {
            cb(err, syncedCsvFile);
            return;
        }
        cb(null, syncedCsvFile);
    });
}

module.exports = startSync;