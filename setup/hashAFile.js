/*eslint-env node*/
/*eslint no-console:0*/

'use-strict';

const hash = require('string-hash'),
    readline = require('readline'),
    fs = require('fs'),
    d3 = require('d3-dsv'),
    rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

function doWork(baseFile) {
    if (baseFile != undefined) {
        var file = "Z:\\QualtricsSync-" + baseFile + ".csv";
        fs.readFile(file, function (err, data) {
            if (err) console.error(err);
            else {
                data = data.toString();
                //        console.log(data);
                console.log(hash(data));
            }
        });
    } else {
        rl.question('Which file would you like to hash?', (answer) => {
            doWork(answer);
            rl.close();
        });
    }
}

doWork(process.argv[2]);
