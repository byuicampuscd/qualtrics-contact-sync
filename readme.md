### Description ###
This script synchronizes csv lists with the qualtrics API. It reads in a configuration file (csv) 
which contains the csv's to be synced, the ID's of the corresponding qualtrics list, and a hash of the file. The tool
re-hashes the file on each run and only resyncs the file if the hashes don't match. This saves thousands of server hits. Yay!
The tool is linked to our repeat-timer script so that the sync can be automated. The script will also send an email 
to a configurable email address if a fatal error occurs. 

On each iteration the tool appends a report to a specified file. The report contains the date & time of the run, the 
total elapsed time, which hashes matched (if any), as well as the amount of additions, deletions, and alterations made per file.
It also includes any non-fatal and fatal errors that occured.

### Setup ###
The repo includes a required auth.json.example file. The values must be filled in and the .example removed from the filename for the authorization to work.
``` js
  "token": "Qualtrics API token",
  "username": "usernameOfSenderAccount",
  "password": "passwordOfSenderAccount",
  "service": 'nameOfService',
  "from": '"Sender Name" <senderEmail@service.com>',
  "to": "recipient email address"
```

The config CSV has the following fields:
```csv, MailingListID, LibraryID, hash```

The settings.json file contains the location of the config file, the path to the csv's (without the csv names. All csv's must be inthe same directory), 
and the location of the log file. This file is included in the repo.

### Usage ###
Run with the command: 
``` js
 node cli 
 ```
Test using test.js located in the test directory.

### Qualtrics API notes ###
This would've been a lot easier if it weren't for the undocumented quirks of the Qualtrics API. I will record as many as I notice here. They are subject to change at any time without warning.
* EmbeddedData values can not be deleted via API once created. They can only be set to an empty string. Setting them to null o rundefined throws a server err
* Adding someone to a mailing list when they are missing a 'required field' (anything outside of embeddedData) is allowed. HOWEVER you will not be able to update them until all required fields are filled.
* This tool causes a lot of 503 errors. I've written the tool to accomodate for that and run basically any failed API call twice. For the most part this works really well
