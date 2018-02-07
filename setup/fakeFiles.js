/*eslint-env node*/

module.exports = [{
    fileName: 'fake File One',
    fileError: 'there was a fake error',
    studentErrors: []
}, {
    fileName: 'fake file two',
    fileError: null,
    passed: false,
    studentErrors: [{
        action: 'Add',
        externalDataReference: 'fakeStudentOne',
        errorMessage: 'A fake error was found'
    }, {
        action: 'Update',
        externalDataReference: 'fakeStudentTwo',
        errorMessage: 'Another fake error was found'
    }]
}, {
    fileName: 'fake File Three',
    fileError: null,
    studentErrors: [],
    passed: true,
    aCount: 1,
    uCount: 2,
    dCount: 3
}, {
    fileName: 'fake file Four',
    fileError: null,
    passed: false,
    studentErrors: [{
        action: 'Add',
        externalDataReference: 'fakeStudentThree',
        errorMessage: 'A fake error was found'
    }, {
        action: 'Update',
        externalDataReference: 'fakeStudentFour',
        errorMessage: 'Another fake error was found'
    }]
}, {
    fileName: 'fake File Five',
    fileError: 'there was another fake error',
    studentErrors: []
}]
