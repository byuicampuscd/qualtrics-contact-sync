/* eslint no-console:1 */

const request = require('request');
const auth = require('./auth.json');
const chalk = require('chalk');

// USE PROCESS.ENV INSTEAD OF AUTH.JSON


/***************************************************
 * Sends all API requests. Takes a requestObj &
 * a callback
 **************************************************/
function makeRequest(reqObj, cb) {
    request(reqObj, cb);
    // request(reqObj.url, reqObj, cb);
}

/**********************************************
 * Gets all contacts from the given csvFile.
 * Calls makeRequest() with paginate() as a callback.
 * Returns an array of contacts to the CB.
 ***********************************************/
function getAll(csvFile, cb, data = []) {
    function paginate(err, response, body) {
        if (err) {
            cb(err);
        } else if (response.statusCode !== 200) {
            cb(new Error(`Status Code: ${response.statusCode}`));
        } else if (response.headers['content-type'] != 'application/json') {
            cb(new Error(`Content Type: ${response.headers['content-type']}`));
        } else {
            /* checking for content-type should ensure that a json response was sent */
            body = JSON.parse(body);
            data = data.concat(body.result.elements);

            /* Write to only one line in the console */
            process.stdout.clearLine();
            process.stdout.cursorTo(0);
            process.stdout.write(chalk.magenta(`Contacts retrieved: ${data.length}`));

            /* paginate if needed */
            if (body.result.nextPage === null) {
                /* new line when we're done */
                process.stdout.write('\n');
                cb(null, data);
            } else {
                requestObj.url = body.result.nextPage;
                makeRequest(requestObj, paginate, data);
            }

        }
    }
    /* initial request object */
    var requestObj = {
        method: 'GET',
        url: `https://byui.az1.qualtrics.com/API/v3/mailinglists/${csvFile.config.MailingListID}/contacts`,
        headers: {
            'x-api-token': auth.token
        }
    };
    /* make initial request */
    makeRequest(requestObj, paginate);
}

function addContact(csvFile, contact, cb) {
    var requestObj = {
        method: 'POST',
        url: `https://byui.az1.qualtrics.com/API/v3/mailinglists/${csvFile.config.MailingListID}/contacts`,
        body: JSON.stringify(contact),
        headers: {
            'content-type': 'application/json',
            'x-api-token': auth.token
        }
    };

    makeRequest(requestObj, (err, response, body) => {
        if (err) {
            cb(err);
            return;
        } else if (response.statusCode !== 200) {
            cb(new Error(`Status Code ${response.statusCode}`));
            return;
        } else if (response.headers['content-type'] != 'application/json') {
            cb(new Error(`Content Type: ${response.headers['content-type']}`));
            return;
        }
        cb(null, JSON.parse(body));
    });
}

function updateContact(csvFile, contact, cb) {
    // pull ID off of the contact!
    var requestObj = {
        method: 'PUT',
        url: `https://byui.az1.qualtrics.com/API/v3/mailinglists/${csvFile.config.MailingListID}/contacts`,
        body: JSON.stringify(contact),
        headers: {
            'x-api-token': auth.token
        }
    };

    makeRequest(requestObj, cb);
}

function deleteContact(csvFile, contact, cb) {
    // pull ID off of the contact!
    var requestObj = {
        method: 'DELETE',
        url: `https://byui.az1.qualtrics.com/API/v3/mailinglists/${csvFile.config.MailingListID}/contacts/${contact.id}`,
        headers: {
            'x-api-token': auth.token
        }
    };

    makeRequest(requestObj, cb);
}

module.exports = {
    getContacts: getAll,
    addContact: addContact,
    updateContact: updateContact,
    deleteContact: deleteContact
};