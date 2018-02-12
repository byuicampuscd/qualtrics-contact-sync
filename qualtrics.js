const request = require('request');
const auth = require('./auth.json');

// USE PROCESS.ENV INSTEAD OF AUTH.JSON

function get(url, cb, data = []) {
    /* base URL */
    request({
        method: 'GET',
        url: url,
        headers: {
            'x-api-token': auth.token
        }
    }, (err, response, body) => {
        if (err) {
            cb(err);
        } else if (response.statusCode !== 200) {
            cb(new Error(`Status Code: ${response.statusCode}`));
        } else {
            // LIABLE TO BREAK
            body = JSON.parse(body);
            data = data.concat(body.result.elements);

            /* paginate if needed */
            if (body.result.nextPage === null) {
                cb(null, data);
            } else {
                get(body.result.nextPage, cb, data);
            }

        }
    });
}

function makeRequest(reqObj, cb) {
    request(reqObj, cb);
}




function getAllContacts(csvFile, waterfallCb, data = []) {
    function paginate(err, response, body) {
        if (err) {
            waterfallCb(err);
        } else if (response.statusCode !== 200) {
            waterfallCb(new Error(`Status Code: ${response.statusCode}`));
        } else {
            // LIABLE TO BREAK
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

    var requestObj = {
        method: 'GET',
        url: `https://byui.az1.qualtrics.com/API/v3/mailinglists/${csvFile.config.MailingListID}/contacts`,
        headers: {
            'x-api-token': auth.token
        }
    };

    makeRequest(requestObj, paginate);

    // get(url, cb);
}


module.exports = {
    getContacts: getAllContacts,
};