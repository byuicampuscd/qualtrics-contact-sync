/*eslint-env node*/
/*eslint no-console:0*/

var prompt = require('prompt');


function convertValues(promptData, daFunction) {
    var timeout = 0;
    timeout = (((promptData.days * 24 + promptData.hours) * 60 + promptData.minutes) * 60 + promptData.seconds) * 1000;
    
    //start loop
    console.log("Interval set to " + timeout + " milliseconds \nBeginning timer");
    daFunction();
    setInterval(daFunction, timeout);
}

function promptUser(daFunction) {
    var settings = {
        properties: {
            days: {
                pattern: /\d+/g,
                message: "Value must be a number",
                type: 'integer',
                default: 0
            },
            hours: {
                pattern: /\d+/g,
                message: "Value must be a number",
                type: 'integer',
                default: 0
            },
            minutes: {
                pattern: /\d+/g,
                message: "Value must be a number",
                type: 'integer',
                default: 0
            },
            seconds: {
                pattern: /\d+/g,
                message: "Value must be a number",
                type: 'integer',
                default: 0
            }
        }
    };
    console.log("How frequently you like the program to run?");
    prompt.start();
    prompt.get(settings, function (err, results) {
        if (err) {
            console.error(err);`+`
            return;
        }
        convertValues(results, daFunction);
    });
}


module.exports = promptUser;
