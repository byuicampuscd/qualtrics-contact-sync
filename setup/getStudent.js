/* eslint no-console:0 */

const auth = require('../auth.json').token;
// const request = require('request');
const qualtrics = require('../qualtrics.js');



qualtrics.changeUser(auth);

qualtrics.getContacts({
    config: {
        MailingListID: 'ML_bEm4yvjG2kQMsT3'
    }
}, (err, contacts) => {
    if (err) {
        console.error(err);
        return;
    }
    var contact = contacts.filter(contact => contact.externalDataReference === 'jackieduran20');
    console.log(JSON.stringify(contact, null, 3));
});