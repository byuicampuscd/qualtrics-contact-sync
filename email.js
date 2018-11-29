/* eslint no-console:0 */

const nodemailer = require('nodeMailer');
const settings = require('./settings.json');
const chalk = require('chalk');

module.exports = () => {
    /***********************
     * Send a single email
     ***********************/
    function sendEmail(mailOption) {
        transporter.sendMail(mailOption, (err, result) => {
            if (err) {
                console.error(err);
                return;
            }
            console.log('message %s sent: %s', mailOption.to, result.response);
        });
    }

    /*************
     * Start Here 
     *************/
    /* Make sure we have all the info we need to send an email */
    if (!settings.email || !settings.email.service || !settings.email.from || !settings.email.to) {
        console.log(chalk.yellow('Incomplete settings file. Unable to send email'));
        return;
    } else if (!process.env.USR || !process.env.PASS) {
        console.log(chalk.yellow('Missing email credentials. Unable to send email'));
        return;
    }


    var message = 'There was an error with the Qualtrics Sync Tool. Please refer to the log for more detail\n\n This is an automatic message. Please do not respond.';
    var transporter = nodemailer.createTransport({
        service: settings.email.service, //Outlook365 for BYUI email
        auth: {
            user: process.env.USR,
            pass: process.env.PASS
        }
    });

    /* create an arry of options if multiple senders are specified.
     makes file backwards compatible */
    if (settings.email.to instanceof Array) {
        var mailingList = settings.email.to.map((receiver) => {
            return {
                from: settings.email.from,
                to: receiver,
                subject: 'Error with Qualtrics Contact Sync',
                text: message
            };
        });
        mailingList.forEach(sendEmail);
    } /* else send one */
    else {
        sendEmail({
            from: settings.email.from,
            to: settings.email.to,
            subject: 'Error with Qualtrics Contact Sync',
            text: message
        });
    }
};