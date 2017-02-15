// call linkSnatcher & get all mailing list objects
const linkSnatcher = require('./linkSnatcher.js'),
    processMailingList = require('./processMailingList.js'),
    pml = new processMailingList(),
    ls = new linkSnatcher();
//

/*var sandbox = {};
sandbox.filePath = 'lists/QualtricsSync-Sandbox.csv';
sandbox.id = "ML_bEm4yvjG2kQMsT3";
sandbox.name = 'sandbox';*/

function init(links) {
    console.log(links);
    links.forEach(function (link) {
        console.log(link);
        pml.init(link);
    });


//    pml.init(sandbox);
}

ls.snatchLinks(init);
