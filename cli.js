// call linkSnatcher & get all mailing list objects
const studentSnatcher = require('./studentSnatcher.js'),
    processMailingList = require('./processMailingList.js'),
    chalk = require('chalk'),
    async = require('async'),
    ss = new studentSnatcher();

//write to log



//display status to screen
function generateReport(students) {
    console.log("called!");
}


function init(err, links) {
    //    console.log(links);

    async.mapLimit(links, 1, processMailingList, function (err, files) {
        if (err) {
            console.log(chalk.red(err));
        } else {

            console.log(chalk.green('\nSync Complete!\n'));
            //            console.log(files);
        }
    });
}

ss.readConfig(init);






// generate report of completed additions/updates/deletions
/*if (file.aCount)
    console.log(chalk.green("Students successfully added: " + aCount));
if (file.uCount)
    console.log(chalk.green("Students successfully updated: " + uCount));
if (file.dCount)
    console.log(chalk.green("Students successfully deleted: " + dCount));*/


//generate report of students who failed to sync
/*file.failed.forEach(function (student) {
    console.log(chalk.red("Failed to " +
        student.action + " student: ") + student.externalDataReference, chalk.red("Error: " + student.errorMessage));
});*/
