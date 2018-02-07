/* eslint-env node */


var sandboxML = "ML_bEm4yvjG2kQMsT3", // ID for sandbox mailing list
    MLRP = 'MLRP_eK9J2g4Ajav431b', // Student ID
    baseURL = "https://az1.qualtrics.com/API/v3/mailinglists",
    token = "GyqDsvacywU3bLfdW6zqzqtMPRSDNsTqEac8LZTU";
//var GR = "GR_8qy8xTkvkjUK3pX";

// 0 - get mailing list
// 1 - get all students in mailing list
// 2 - create a new student
// 3 - Remove a student
// 4 - update a student

module.exports = [{
    method: 'GET',
    url: baseURL,
    headers: {
        'x-api-token': token
    }
}, {
    method: 'GET',
    url: baseURL + "/" + sandboxML + "/contacts",
    headers: {
        'x-api-token': token
    }
}, {
    method: 'POST',
    url: baseURL + "/" + sandboxML + "/contacts",
    headers: {
        'x-api-token': token,
        'content-type': 'application/json'
    },
    body: '{"SessionOrder": "236","Semester": "FA17","UniqueID": "aaiton","FirstName": "Alex","LastName": "Aiton","Email": "ait13002@byui.edu","Subprogram": "DAY","Pathway": "","Gender": "Female","CountryOnline": "United States","State": "Idaho","Classification": "Sophomore","Age": "20","Major": "Music"}'
}, {
    method: 'DELETE',
    url: baseURL + "/" + sandboxML + "/contacts/" + MLRP,
    headers: {
        'x-api-token': token
    }
}, {
    method: 'PUT',
    url: baseURL + "/" + sandboxML + "/contacts/" + MLRP,
    headers: {
        'x-api-token': token,
        'content-type': 'application/json'
    },
    body: '{"firstName": "Angie","lastName": "alfred","email": "gar11043@byui.edu","externalDataReference": "a_garciapaz","embeddedData": {"Classification": "Senior","Age": "23","State": "Idaho","Subprogram": "DAY","Major": "Web Design and Development","Semester": "FA17","SessionOrder": "236","Gender": "Female","CountryOnline": "United States","LastName": "","Pathway": ""},"language": null}'
}];
