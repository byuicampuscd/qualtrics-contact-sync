const request = require('request');
const auth = require('./auth.json');

// USE PROCESS.ENV INSTEAD OF AUTH.JSON


/***************************************************
 * Sends all API requests. Takes a requestObj &
 * a callback
 **************************************************/
function makeRequest(reqObj, cb) {
    request(reqObj, cb);
}

/**********************************************
 * Gets all contacts from the given csvFile.
 * Calls makeRequest() with paginate() as a callback.
 * Returns an array of contacts to the CB.
 ***********************************************/
function getAllContacts(csvFile, waterfallCb, data = []) {
    function paginate(err, response, body) {
        if (err) {
            waterfallCb(err);
        } else if (response.statusCode !== 200) {
            waterfallCb(new Error(`Status Code: ${response.statusCode}`));
        } else if (response.headers['content-type'] != 'application/json') {
            waterfallCb(new Error(`Content Type: ${response.headers['content-type']}`));
        } else {
            /* checking for content-type should ensure that a json response was sent */
            body = JSON.parse(body);
            data = data.concat(body.result.elements);

            /* paginate if needed */
            if (body.result.nextPage === null) {
                waterfallCb(null, data);
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


module.exports = {
    getContacts: getAllContacts,
};