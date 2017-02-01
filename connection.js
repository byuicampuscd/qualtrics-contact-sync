/* eslint-env node */
/* eslint no-console:0 */

var request = require("request");
var fs = require("fs");
var options = require('./options.js');


var sandboxML = "ML_a4VxkqLdvZQeeEJ";
var MLRP = 'MLRP_25iWJEv63JRvDCZ';
var baseURL = "https://az1.qualtrics.com/API/v3/mailinglists";





function getMailingList(options) {
    request(options, function (error, response, body) {
        if (error) throw new Error(error);
        // run some code

        var fd = JSON.stringify(JSON.parse(body), null, 4);
        console.log(fd);

        /*fs.appendFile('mailingLists.json', fd, (err) => {
            if (err)
                console.error(err);
            console.log("data successfully appended");
        });*/
    });
}

function createStudent(options) {
    request(options, function (error, response, body) {
        if (error) throw new Error(error);

        var fd = JSON.stringify(JSON.parse(body), null, 4);
        console.log(fd);

        // append data to a file
        /*fs.appendFile('newStudent.json', fd, (err) => {
            if (err)
                console.error(err);
            console.log("data successfully appended");
        });*/
    });
}

function getStudents(options) {
    request(options, function (error, response, body) {
        if (error) throw new Error(error);
        // run some code
        var fd = JSON.stringify(JSON.parse(body), null, 4);
        console.log(fd);

        // append data to a file
        /* fs.appendFile('allStudents.json', fd, (err) => {
             if (err)
                 console.error(err);
             console.log("data successfully appended");
         });*/

    });
}

function deleteStudent(options) {
    request(options, function (error, response, body) {
        if (error) throw new Error(error);

        if (response.statusCode === 200) {
            console.log("Student successfully deleted");
        }
    });
}

function updateStudent(options) {
    request(options, function (error, response, body) {
        if (error) throw new Error(error);

        if (response.statusCode === 200) {
            console.log("Student successfully updated");
        }
    });
}

function main(action) {
    switch (action) {
        case "1":
            getMailingList(options);
            break;
        case "2":
            getStudents(options2);
            break;
        case "3":
            createStudent(options3);
            break;
        case "4":
            deleteStudent(options4);
            break;
        case "5":
            updateStudent(options5);
            break;
        default:
            console.log("Please enter a valid command:\n 1 Get Mailing List\n 2 Get Students\n 3 Create Student\n 4 Remove Student\n 5 Update Student");
    }

}

main(process.argv[2]);

//console.log(options2);
