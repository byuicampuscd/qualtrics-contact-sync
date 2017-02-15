/* eslint-env node */
'use strict';
const token = require('./token.js');

var optionSnatcher = function () {};
var proto = optionSnatcher.prototype;

var baseURL = "https://az1.qualtrics.com/API/v3/mailinglists",
    option = {
        method: "",
        url: "",
        headers: {
            'x-api-token': token
        }
    };

proto.getMLs = function () {
    option.method = "GET";
    option.url = baseURL;
    return option;
}

proto.add = function (student) {
    var toSend = JSON.parse(JSON.stringify(student));
    toSend.externalDataRef = toSend.externalDataReference;
    delete toSend.externalDataReference;
    delete toSend.action;

    option.method = 'POST';
    option.url = baseURL + "/" + ml + "/contacts";
    option.headers["content-type"] = 'application/json';
    option.body = JSON.stringify(toSend);
    return option;
}

proto.update = function (ml, student) {
    var toSend = JSON.parse(JSON.stringify(student));
    delete toSend.id;
    delete toSend.action;

    option.method = 'PUT';
    option.url = baseURL + "/" + ml + "/contacts/" + student.id;
    option.headers["content-type"] = 'application/json';
    option.body = JSON.stringify(toSend);
    return option;
}

proto.delete = function (ml, id) {
    option.method = 'DELETE';
    option.url = baseURL + "/" + ml + "/contacts/" + id;
    return option;
}

//get students
proto.get = function (ml, nextPage) {
    if (!nextPage) option.url = baseURL + "/" + ml + "/contacts";
    else option.url = nextPage;

    option.method = 'GET';

    return option;
}

module.exports = optionSnatcher;
