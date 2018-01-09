/*eslint-env node, es6*/
/*eslint no-console:0*/

const asyncLib = require('async'),
    fs = require('fs'),
    chalk = require('chalk'),
    studentSnatcher = require('../studentSnatcher.js'),
    processMailingList = require('../processMailingList.js'),
    optionSnatcher = require('../optionSnatcher.js'),
    os = new optionSnatcher(),
    ss = new studentSnatcher();

function verifier(err, csvList) {
    if (err) {
        console.log(chalk.red(err));
        return;
    }

    asyncLib.map(csvList, (students, cb) => {
        /* Pull students from sandbox */
        ss.pullStudents(os.get(students.link.MailingListID), (err, qStudents) => {
            if (err) {
                cb(err);
                return;
            }
            console.log(chalk.green(`\nCompleted ${students.link.csv}`));
            cb(null, `\n${students.link.csv.toUpperCase()}\n ${JSON.stringify(qStudents, null, 2)}`);
        });
    }, (err, list) => {
        if (err) {
            console.error(chalk.red(err));
            return;
        }
        fs.writeFileSync('log.txt', list, (err) => {
            if (err) {
                console.error(chalk.red(err));
                return;
            }
            console.log(chalk.green('log written'))
        });
    });
}


function init() {
    ss.readConfig(function (err, links) {
        if (err) {
            err = '\nUnable to read configuration file\n' + err;
            console.log(chalk.red(err));
            return;
        }

        // console.log(links[0]);
        var wrapperLinks = links.map(link => {
            link.matchingHash = false;
            link.newHash = '123456';
            return {
                file: false,
                link: link
            }
        });

        function starter(link, cb) {
            console.log(chalk.blue(`${link.link.csv}`));

            processMailingList(link, cb);
        }
        asyncLib.mapLimit(wrapperLinks, 1, starter, verifier);
    });
}

init();
