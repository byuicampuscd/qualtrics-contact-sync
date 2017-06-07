/* eslint-env node */
/* eslint no-console:0 */
'use strict';

const nodemailer = require('nodeMailer'),
    auth = require('./auth.js');

function sendMail(message) {
    let transporter = nodemailer.createTransport({
        service: auth.service, //Outlook365
        auth: {
            user: auth.username,
            pass: auth.password
        }
    });

    let mailOptions = {
        from: auth.from,
        to: auth.to,
        subject: "Error with Qualtrics Contact Sync",
        text: message
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            return console.log(error);
        }
        return console.log('message %s sent: %s', info.messageId, info.response);
    });
}


module.exports = sendMail;
