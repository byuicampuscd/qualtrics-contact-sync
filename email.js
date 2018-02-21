/* eslint no-console:0 */

const nodemailer = require('nodeMailer');
const auth = require('./auth.json');

module.exports = () => {
    var message = 'There was an error with the Qualtrics Sync Tool. Please refer to the log for more detail\n\n This is an automatic message. Please do not respond.';
    /***********************
     * Send a single email
     ***********************/
    function sendMail(mailOption) {
        transporter.sendMail(mailOption, (error, result) => {
            if (error) {
                console.error(error, mailOption.to);
            }
            console.log('message %s sent: %s', mailOption.to, result.response);
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
};