/* eslint-env node, es6 */
/* eslint no-console:0 */

var request = require("request");
var options = require('./options.js');
var asyncLib = require('async');


function getMailingList(options) {
    request(options, function (error, response, body) {
        if (error) {
            throw new Error(error);
            return;
        }

        var sData = JSON.stringify(JSON.parse(body), null, 4);
        // console.log(sData);

        var lists = JSON.parse(body).result.elements;

        lists.forEach(list => {
            console.log(list.name);
            console.log(list.id + '\n');
        });


    });
}

function createStudent(options) {
    request(options, function (error, response, body) {
        if (error) throw new Error(error);

        var fd = JSON.stringify(JSON.parse(body), null, 4);
        console.log(fd);
    });
}

function getStudents(options, cb) {
    request(options, function (error, response, body) {
        if (error) throw new Error(error);
        var students = JSON.parse(body).result.elements;

        if (cb != undefined) {
            cb(students);
        } else {
            students.forEach(student => {
                console.log(JSON.stringify(student, null, 2), '\n');
            })
            console.log('\nNumber of Students: ', students.length);
        }

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

function updateStudent(option) {
    request(option, function (error, response, body) {
        if (error) {
            console.error(error);
            return;
        }
        if (response.statusCode === 200) {
            console.log("Student successfully updated");
        } else {
            console.log(response.statusCode);
            console.log(body);
        }
    });
}

function clearMailingList() {
    getStudents(options[1], (students) => {
        //check if results is an array
        console.log(students instanceof Array);
        console.log(students.length);

        var studentId = students.map()

        asyncLib.each(students, deleteStudent)
    });
}


function main(action) {
    switch (action) {
        case "1":
            getMailingList(options[0]);
            break;
        case "2":
            getStudents(options[1]);
            break;
        case "3":
            createStudent(options[2]);
            break;
        case "4":
            deleteStudent(options[3]);
            break;
        case "5":
            var opt = options[4];
            updateStudent(opt);
            break;
        case "6":
            clearMailingList();
            break;
        default:
            console.log("Please enter a valid command:\n 1 Get Mailing List\n 2 Get Students\n 3 Create Student\n 4 Remove Student\n 5 Update Student\n 6 Clear Sandbox");
    }

}

main(process.argv[2]);
