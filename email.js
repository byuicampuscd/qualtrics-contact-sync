/* eslint-env node, es6 */
/* eslint no-console:0 */
'use strict';

const nodemailer = require('nodeMailer'),
    auth = require('./auth.json');

/*********************************************
 * Prepare error messages and call sendMail
 * when complete. Can send one or many emails
 *********************************************/
function prepMail(message) {
    message += '\n\n This is an automatic message. Please do not respond.';
    /***********************
     * Send a single email
     ***********************/
    function sendMail(mailOption) {
        transporter.sendMail(mailOption, (error, result) => {
            if (error) {
                return console.log(error, mailOption.to);
            }
            return console.log('message %s sent: %s', mailOption.to, result.response);
        });
    }

    var transporter = nodemailer.createTransport({
        service: auth.service, //Outlook365 for BYUI email
        auth: {
            user: auth.username,
            pass: auth.password
        }
    });

    /* create an arry of options if multiple senders are specified.
     makes file backwards compatible */
    if (auth.to instanceof Array) {
        var mailingList = auth.to.map((receiver) => {
            return {
                from: auth.from,
                to: receiver,
                subject: 'Error with Qualtrics Contact Sync',
                text: message
            };
        });
        mailingList.forEach(sendMail);
    } /* else send one */
    else {
        sendMail({
            from: auth.from,
            to: auth.to,
            subject: 'Error with Qualtrics Contact Sync',
            text: message
        });
    }
}

module.exports = prepMail;