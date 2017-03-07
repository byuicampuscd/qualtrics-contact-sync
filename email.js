/* eslint-env node */
/* eslint no-console:0 */
'use strict';

const nodemailer = require('nodeMailer'),
    mailInfo = require('./emailInfo.js');

function sendMail(message) {
    let transporter = nodemailer.createTransport({
        service: mailInfo.service, //Outlook365
        auth: {
            user: mailInfo.username,
            pass: mailInfo.password
        }
    });

    let mailOptions = {
        from: mailInfo.from,
        to: mailInfo.to,
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
