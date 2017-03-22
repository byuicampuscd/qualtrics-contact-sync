/*eslint-env node*/
/*eslint no-console:0*/

'use-strict';

const hash = require('string-hash'),
    fs = require('fs'),
    d3 = require('d3-dsv');

function doWork() {
    var file = "lists/QualtricsSync-AdmittedOnlineStudents.csv";
    fs.readFile(file, function (err, data) {
        if (err) console.error(err);
        data = data.toString();
        //        console.log(data);
        console.log(hash(data));
    });
}

doWork();
