/*eslint-env node, es6*/
/*eslint no-console:0*/


function equalityFilter(qStudent, listStudent) {
    var keysToRemove = ['id', 'unsubscribed', 'responseHistory', 'emailHistory'],
        outerStudentKeys = Object.keys(qStudent),
        qEmDataKeys = Object.keys(qStudent.embeddedData),
        emDataKeys = Object.keys(listStudent.embeddedData);

    /* remove qualtrics specific keys from qStudent */
    outerStudentKeys.forEach((key) => {
        if (keysToRemove.indexOf(key) > -1) {
            /* if key is listed in keysToRemove, delete it */
            delete qStudent[key];
        }
    });

    /* remove old data fields from Qualtrics. These are empty strings in QStudent
     and don't exist in listStudent*/
    qEmDataKeys.forEach((emKey) => {
        if (qStudent.embeddedData[emKey] === '' && emDataKeys.indexOf(emKey) == -1) {
            delete  qStudent.embeddedData[emKey];
        }
    });

    return qStudent;
}

var s1 = {id:'1234', embeddedData:{oldValue:'', currVal: '27'}},
    s2 = {embeddedData:{currVal: '28'}};


var h = equalityFilter(s1, s2);
console.log(h);