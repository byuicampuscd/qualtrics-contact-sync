/* eslint-env node, es6 */
/* eslint no-console:0 */
'use strict';

/* link is used to pass vital information from the start to end of this module */
/* pullCount is used to attempt a 2nd pull request to qualtrics if an err occurs */
var link,
    pullCount = 0;

const deepEqual = require('deep-equal'),
    bs = require('binarysearch'),
    chalk = require('chalk'),
    StudentSnatcher = require('./studentSnatcher.js'),
    optionSnatcher = require('./optionSnatcher.js'),
    logWriter = require('./logWriter.js'),
    settings = require('./settings.json'),
    asyncLib = require('async'),
    lw = new logWriter(),
    ss = new StudentSnatcher(),
    os = new optionSnatcher();

/**************************
 * sort based on unique ID
 **************************/
function sortList(a, b) {
    if (a.externalDataReference < b.externalDataReference) return -1;
    if (a.externalDataReference > b.externalDataReference) return 1;
    return 0;
}

/************************************
 * format errors and send to callback
 *************************************/
function sendFileError(err, cb) {
    var result = {
        link: link,
        file: {
            fileName: link.csv,
            fileError: err.toString()
        }
    };
    console.log(chalk.red(err));

    lw.generateFile(result);
    cb(null, result);
}

/**********************************************************
 * called once the API calls to qualtrics finish
 * formats results of the calls, such as added, updated, 
 * and deleted count
 ********************************************************/
function generateFileData(err, students) {
    var cb = this;
    if (err) {
        console.error(err);
        sendFileError(err, cb);
        return;
    }
    /* file is returned to cli.js */
    var file = {
        fileName: link.csv,
        toAlterAmount: students.length,
        studentsAdded: [],
        studentsUpdated: [],
        studentsDeleted: [],
        passed: true,
        studentErrors: [],
        fileError: null
    };
    /* sort through students and create report based on worked/error attributes */
    students.forEach(function (student) {
        if (student.pass && !student.filterFail) {
            if (student.action == 'Add')
                file.studentsAdded.push(student);
            else if (student.action == 'Update')
                file.studentsUpdated.push(student);
            else
                file.studentsDeleted.push(student);
        } else
            file.studentErrors.push(student);
    });

    /* generate report of completed additions/updates/deletions */
    if (file.studentsAdded.length > 0)
        console.log(chalk.green('Students successfully added: ' + file.studentsAdded.length));
    if (file.studentsUpdated.length > 0)
        console.log(chalk.green('Students successfully updated: ' + file.studentsUpdated.length));
    if (file.studentsDeleted.length > 0)
        console.log(chalk.green('Students successfully deleted: ' + file.studentsDeleted.length));

    file.studentErrors.forEach(function (student) {
        console.log(chalk.red('Failed to ' +
            student.action + ' student: ') + student.externalDataReference, chalk.red(student.errorMessage));
    });
    if (file.studentErrors.length)
        file.passed = false;
    // console.log('FILE:\n', file);

    var wrapper = {
        file: file,
        link: link
    };

    lw.generateFile(wrapper);

    // return to cli.js
    cb(err, wrapper);

}

/***********************************************
 * create approptriate API call for each action
 ************************************************/
function setOptions(student, callback) {
    // console.log(chalk.magenta('setOptions'));
    var option = '';
    /* create approptriate API call */
    switch (student.action) {
    case 'Add':
        /* if student is missing a required field*/
        if (student.filterFail === true) {
            callback(null, student);
            return;
        }
        option = os.add(link.MailingListID, student);
        break;
    case 'Update':
        option = os.update(link.MailingListID, student);
        break;
    case 'Delete':
        option = os.delete(link.MailingListID, student.id);
        break;
    }
    ss.send(student, option, callback);
}

/**************************************************
 * Takes 2 students. adds fields from the reference
 * that are missing from the first student with the
 *  value "". For clearing old fields.
 **************************************************/
function clearUnusedFields(student, reference) {
    var keys = Object.keys(student.embeddedData),
        refKeys = Object.keys(reference.embeddedData);

    refKeys.forEach((refKey) => {
        if (!keys.includes(refKey)) {
            student.embeddedData[refKey] = '';
        }
    });

    return student;
}
/****************************************************
 * filter out all empty values before adding student
 * ensure all required fields are set and set an err if they are not
 ***************************************************/
function addFilter(student) {
    var keys = Object.keys(student),
        emKeys = Object.keys(student.embeddedData),
        requiredFields = ['lastName', 'firstName', 'Email', 'ExternalDataRef'];

    /* remove empty fields*/
    keys.forEach((key) => {
        if (student[key] === '' || student[key] === undefined) {
            /* if empty field is required, err, else delete it */
            if (requiredFields.includes(key)) {
                /* must use something other than student.pass or else it will still attempt to add studen to qualtrics*/
                student.filterFail = true;
                student.errorMessage = `${student.externalDataReference} was not added because a required field was missing`;
            } else
                delete student[key];
        }
    });

    /* remove empty embeddedData fields*/
    emKeys.forEach((emKey) => {
        if (student.embeddedData[emKey] === '' || student.embeddedData[emKey] === undefined) {
            delete student.embeddedData[emKey];
        }
    });

    return student;
}

/***********************************************
 * filter student object for equality comparison. 
 * returns a  filtered copy of the object
 *************************************************/
function equalityFilter(student, comparisonStudent) {

    var studentToFilter = Object.assign({}, student),
        keysToRemove = ['id', 'unsubscribed', 'responseHistory', 'emailHistory', 'language'],
        outerStudentKeys = Object.keys(studentToFilter),
        emDataKeys = Object.keys(studentToFilter.embeddedData),
        cEmDataKeys = Object.keys(comparisonStudent.embeddedData); // embeddedData keys for comparison student

    /* remove qualtrics specific keys from studentToFilter */
    outerStudentKeys.forEach((key) => {
        if (keysToRemove.includes(key)) {
            /* if key is listed in keysToRemove, delete it */
            delete studentToFilter[key];
        } else if (!studentToFilter[key]) {
            /* convert null values to empty string. Fixes comparison issue where students were added with null values */
            studentToFilter[key] = '';
        }
    });

    /* remove old data fields from Qualtrics. These are empty strings in studentToFilter
     and don't exist in comparisonStudent*/
    /* Also checks if an external field exists inside embeddedData, in case they get saved there accidently */
    emDataKeys.forEach((emKey) => {
        if ((studentToFilter.embeddedData[emKey] === '' && !cEmDataKeys.includes(emKey)) || keysToRemove.includes(emKey)) {
            delete studentToFilter.embeddedData[emKey];
        }
    });

    return studentToFilter;
}

/****************************************************
 * attempts tp re-sync all students who didn't pass. 
 * the server throws a lot of 503 errors and parse errors
 * when handling large lists.
 *****************************************************/
function retryfailedStudents(err, students) {
    if (err) {
        console.error(err);
        sendFileError(err, cb);
        return;
    }

    /* Because mapLimit was used, the cb had to be passed in with bind as the this value.
     In order to pass cb to the next function we have to bind it to the function with a different name and call the bound version */
    var cb = this,
        generateFileDataBound = generateFileData.bind(cb),
        failedStudents = students.filter(function (student) {
            if (student.filterFail === true) {
                delete student.filterFail;
                return false;
            } else if (student.pass === false)
                return student;
        });

    if (failedStudents.length > 0) {
        console.log(failedStudents.length + chalk.yellow(' Students failed to sync. Attempting to re-sync now.'));
        asyncLib.mapLimit(failedStudents, 10, function (student, callback) {
            delete student.pass;
            delete student.errorMessage;
            setOptions(student, callback);
        }, function (err, failedStudentResult) {
            if (err) {
                console.error(err);
                sendFileError(err, cb);
                return;
            }
            students = students.concat(failedStudentResult);
            generateFileDataBound(null, students);
        });
    } else {
        generateFileDataBound(null, students);
    }

}

/********************************************************
 * sorts the qualtrics list & csv lists and uses a binary
 * search to check for equality
 ********************************************************/
function compareStudents(students, cb, qStudents) {
    console.log(chalk.magenta('Comparing Students'));
    var toAlter = [];

    students.forEach(function (student) {
        var qIndex;

        /* get the index of matching students by externalDataRef property */
        qIndex = bs(qStudents, student, sortList);

        /* If the student exists in both lists, check for equality */
        if (qIndex > -1) {
            /* create version to use for equality check. Remove Qualtrics-specific and old fields. */
            var filteredQStudent = equalityFilter(qStudents[qIndex], student),
                filteredStudent = equalityFilter(student, filteredQStudent); // shouldn't matter if filteredQstudent is used or not..

            /* EQUALITY COMPARISON. */
            if (!deepEqual(filteredStudent, filteredQStudent)) {
                /* add empty values that have been removed from qualtrics */
                filteredStudent = clearUnusedFields(filteredStudent, filteredQStudent);

                filteredStudent.action = 'Update';
                // ID is undefined....
                filteredStudent.id = qStudents[qIndex].id; /* So we know who to update */


                toAlter.push(filteredStudent);
                qStudents[qIndex].checked = true;
            } else {
                /* students matched, no changes needed */
                qStudents[qIndex].checked = true;
            }
        } else {
            /* should this happen before or after I check for required fields? */
            student.action = 'Add';
            /* students to be added don't exist in qStudents array, don't need the checked property */
            toAlter.push(addFilter(student));
        }
    });
    /* exists in qualtrics but not in master file */
    qStudents.forEach(function (student) {
        /* see if checked is undefined */
        if (!student.checked) {
            student.action = 'Delete';
            toAlter.push(student);
        }
    });

    console.log('Changes to be made: ', toAlter.length);

    /* make api calls X at a time -- callback returns here
     .bind sends the final cb to generateFileData as the this value */
    //asyncLib.mapLimit(toAlter, 10, setOptions, generateFileData.bind(cb));
    asyncLib.mapLimit(toAlter, 10, setOptions, retryfailedStudents.bind(cb));
}

/*********************************************
 * pulls student data from qualtrics until
 * nextPage is false
 **********************************************/
function pullStudents(students, cb, qStudents, nextPage) {
    //    console.log(chalk.magenta('pullStudents'));
    if (!qStudents) qStudents = [];
    ss.pullStudents(os.get(link.MailingListID, nextPage), function (err, newStudents, nextPage) {
        /* If err and this is the first time trying to pull students try again */
        if (err && pullCount < 1) {
            pullCount++;
            console.log('Pulling students failed. Attempting to pull students again.');
            pullStudents(students, cb);
            return;
        } else if (err && pullCount >= 1) {
            sendFileError(err, cb);
            return;
        }
        /* add page to student list */
        qStudents = qStudents.concat(newStudents);
        if (nextPage) {
            /* call again if there was another page of students in qualtrics */
            pullStudents(students, cb, qStudents, nextPage);
        } else {
            qStudents.sort(sortList);
            compareStudents(students, cb, qStudents);
        }
    });
}

/***********************************************
 * filter student object so the format matches 
 * qualtrics api format
 *************************************************/
function formatStudents(students) {

    // USE AN ARRAY OF KEYS. LOOP ONCE
    var emdKeys = Object.keys(students[0]).filter(function (key) {
        return key != 'Email' && key != 'UniqueID' && key != 'FirstName' && key != 'LastName';
    });
    // create keys for student object
    var keys = Object.keys(students[0]).filter(function (key) {
        return key == 'Email' || key == 'UniqueID' || key == 'FirstName' || key == 'LastName';
    });

    var formattedStudents = students.map(function (currVal) {
        var tStudent = {},
            tEmbeddedData = {};
        /* format keys and create tempStudent object */
        // USE A FOREACH
        for (var j = 0; j < keys.length; j++) {
            /* UniqueID must be converted to externalDataReference */
            if (keys[j] === 'UniqueID') {
                tStudent.externalDataReference = currVal[keys[j]];
            } else {
                // ALL LOWER CASE!
                /* first letter of each key to lower case */
                tStudent[keys[j][0].toLowerCase() + keys[j].slice(1)] = currVal[keys[j]];
            }
        }

        /* create embeddedData object */
        for (var i = 0; i < emdKeys.length; i++) {
            /* replace undefined values with empty string*/
            if (currVal[emdKeys[i]] == undefined) {
                currVal[emdKeys[i]] = '';
            }
            /* filter commas out of embeddedData values so the qualtrics api won't throw a fit */
            tEmbeddedData[emdKeys[i]] = currVal[emdKeys[i]].replace(/,/g, '');
        }

        if (emdKeys.length > 0)
            tStudent.embeddedData = tEmbeddedData;

        return tStudent;
    });
    return formattedStudents;
}

/******************************************
 * Pull student data from csv & format it
 * to match qualtrics API
 *****************************************/
function init(wrapper, cb) {
    // console.log(chalk.yellow('data to sync:\n'), wrapper);
    link = wrapper.link;

    var filePath = settings.filePath + link.csv;
    /* get students from the csv file */
    ss.readStudents(filePath, function (err, students) {
        if (err) {
            sendFileError(err, cb);
            return;
        }

        /* remove any empty rows */
        students = students.filter(function (student) {
            return student.UniqueID && student.UniqueID !== '';
        });

        //  COMPARE FLAT OBJECTS??
        /* format csv student object to match qualtrics API format */
        if (students.length) {
            students = formatStudents(students);
            students.sort(sortList);
        }

        /* get students from qualtrics */
        console.log(chalk.magenta('Pulling students from Qualtrics'));
        pullStudents(students, cb);
    });
}

module.exports = init;