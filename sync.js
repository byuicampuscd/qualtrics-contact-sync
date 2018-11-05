/* eslint no-console:0 */

const asyncLib = require('async');
const binarySearch = require('binarysearch');
const chalk = require('chalk');
const qualtrics = require('./qualtrics.js');

/* qualtrics generated keys that the csv will not have */
const keysToIgnore = ['language', 'unsubscribed', 'responseHistory', 'emailHistory', 'id'],
    retryContactCount = 3,
    retryContactInverval = 3000,
    pullContactsCount = 2,
    syncApiLimit = 5;

/**************************************************
 * Abstraction of add, update, & delete api calls
 * Good Luck!
 *************************************************/
function makeApiCalls(csvFile, waterfallCb) {
    // TESTING -> this option disables all ADD, UPDATE, & DELETE requests
    if (process.argv.includes('-t')) {
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
        var changesMade = 0;

        asyncLib.eachLimit(action.location, syncApiLimit, wrapRetry, (err) => {
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
                times: retryContactCount,
                interval: retryContactInverval
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

/****************************************
 * Preform any needed formatting needed
 * Prior to a Qualtrics PUT request
 ****************************************/
function updatePrep(csvFile, waterfallCb) {
    /* remove any empty embeddedData objects */
    csvFile.report.toUpdate.forEach(contact => {
        if (Object.keys(contact.embeddedData).length === 0) {
            delete contact.embeddedData;
        }
    });
    waterfallCb(null, csvFile);
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


        // TODO can I add a contact with empty embeddedData values??
        /* Remove embeddedData properties with empty string values (required by API) 
         * Unless embeddedData is empty. Then just kill it */
        if (Object.keys(contact.embeddedData).length === 0) {
            delete contact.embeddedData;
        } else {
            Object.keys(contact.embeddedData).forEach(key => {
                if (contact.embeddedData[key] === '') {
                    delete contact.embeddedData[key];
                }
            });
        }
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
    /* Also has to filter out contacts with duplicate ID's so they don't get deleted */
    csvFile.report.toDelete = [...csvFile.qualtricsContacts].filter(qContact => {
        return csvFile.report.failed.every(failedContact => {
            return qContact.externalDataReference != failedContact.externalDataReference;
        });
    });

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

/******************************************
 * Perform any required sanitization or
 * formatting on qualtrics contact objects 
 ******************************************/
function cleanQualtricsContacts(csvFile, waterfallCb) {
    /* replace null embeddedData objects with empty objects to match csv format */
    csvFile.qualtricsContacts.forEach(qContact => {
        if (qContact.embeddedData === null) {
            qContact.embeddedData = {};
        }
    });

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

        /* Save property to correct location. Replace UniqueID with externalDataReference */
        Object.keys(contact).forEach(key => {
            if (key === 'UniqueID') {
                tempContact.externalDataReference = contact[key];
            } else if (requiredKeys.includes(key)) {
                /* make the first character lower case. For equality comparison 
                        & API compatibility */
                tempContact[key.charAt(0).toLowerCase() + key.slice(1)] = contact[key];
            } else if (contact[key] != undefined) {
                /* remove commas from embeddedData so Qualtrics won't truncate the value */
                tempContact.embeddedData[key] = contact[key].replace(/,/g, '');
                /* Excel turns True to TRUE, which will make the contact update */
                tempContact.embeddedData[key].replace(/^TRUE$/, 'True');
                tempContact.embeddedData[key].replace(/^FALSE$/, 'False');
            }
        });

        /* All contacts formatted, Add invalid contacts to failed list instead of csvContacts */

        // WARNING -> if contact is completely empty they break BEFORE it gets to this point (was this fixed when empty rows were removed from the csv string?)
        /* Only keep the contact if they have a UniqueID AND the UniqueID is not a duplicate */
        if (!contact.UniqueID || contact.UniqueID === '' || ids.indexOf(contact.UniqueID) !== ids.lastIndexOf(contact.UniqueID)) {
            if (!tempContact.externalDataReference) {
                console.log(chalk.yellow(`Failed to Validate contact: ${contact.firstName}, ${contact.lastName}. No UniqueID found`));
            } else {
                console.log(chalk.yellow(`Failed to Validate contact: ${tempContact.externalDataReference}. Please verify contact's UniqueID`));
            }
            /* push contact to failed contacts */
            csvFile.report.failed.push(tempContact);
        } else {
            /* push to formatted contacts */
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
    /* Filter out keys with empty values & embeddedData */
    var cKeys = Object.keys(contact).filter(key => {
            // return contact[key] != '' && key != 'embeddedData';
            return key != 'embeddedData';
        }),
        /* Filter out qualtrics specific keys */
        qKeys = Object.keys(qContact).filter(key => {
            return !keysToIgnore.includes(key) && key != 'embeddedData';
        }),
        equal = true;

    /* Compare outer object - only runs once because we know the keys are the same */

    /* delete the key if it's empty in both places. sending a required field with an empty string value causes a 400 error */
    equal = cKeys.every(cKey => {
        if (contact[cKey] === '' && qContact[cKey] === null) {
            delete contact[cKey];
            return true;
        }

        /* if key exists on both contacts & the value is the same */
        var same = qKeys.includes(cKey) && contact[cKey] === qContact[cKey];

        /* add diff to csvFile for reporting later */
        if (!same) {
            csvFile.report.contactDiffs.push({
                externalDataReference: contact.externalDataReference,
                contact1: `${cKey} : ${contact[cKey]}`,
                contact2: `${cKey} : ${qContact[cKey]}`
            });
        }
        return same;
    });

    /* EMBEDDED DATA */
    /* Must loop through the keys of both objects or it won't catch keys which need to be deleted (cleared) */

    /* Compare contact to qContact */
    if (equal) {
        equal = checkEmbeddedData(contact, qContact, csvFile);
    }
    /* Compare qContact to contact */
    if (equal) {
        equal = checkEmbeddedData(qContact, contact, csvFile);
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
function checkEmbeddedData(contact1, contact2, csvFile) {
    var emKeys1 = Object.keys(contact1.embeddedData),
        emKeys2 = Object.keys(contact2.embeddedData);

    /* Ensure each object has the other's empty values so that they can be cleared/ deleted */
    emKeys1.forEach(key => {
        if (!emKeys2.includes(key) && (contact1.embeddedData[key] != '' || emKeys2.length === 0)) {
            contact2.embeddedData[key] = '';
            emKeys2.push(key);
        }
    });

    return emKeys1.every(key => {
        /* TRUE IF (key exists in both contacts & value is the same) OR (key exists only on current contact but value is '') */
        var same = emKeys2.includes(key) && contact1.embeddedData[key] === contact2.embeddedData[key] ||
            !emKeys2.includes(key) && contact1.embeddedData[key] === '';

        if (!same) {
            // append to csvFile for reporting later
            csvFile.report.contactDiffs.push({
                externalDataReference: contact1.externalDataReference,
                contact1: `${key} : ${contact1.embeddedData[key]}`,
                contact2: `${key} : ${contact2.embeddedData[key]}`
            });
        }

        return same;
    });
}

/**************************************************
 * sort any list by externalDataReference property
 **************************************************/
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
        asyncLib.retryable(pullContactsCount, pullContacts), /* make X attempts at pullContacts() */
        cleanQualtricsContacts,
        sortContacts, /* sort by externalReferenceId */
        compareContacts, /* equality comparison */
        report, /* mostly for debugging */
        addPrep, /* filters & prepares the contacts who need to be added */
        updatePrep,
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