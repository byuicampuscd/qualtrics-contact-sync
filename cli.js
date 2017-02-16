// call linkSnatcher & get all mailing list objects
const studentSnatcher = require('./studentSnatcher.js'),
    processMailingList = require('./processMailingList.js'),
    chalk = require('chalk'),
    async = require('async'),
    ss = new studentSnatcher();

function init(err, links) {
    //    console.log(links);

    async.mapLimit(links, 1, processMailingList, function (err, data) {
        if (err) throw new Error(err);
        else console.log(chalk.green('SUCCESS!'));
    });
}

ss.readConfig(init);
