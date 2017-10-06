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
The repo does not incluse a required auth.json file with the following values:
```
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
run with the command: ``` node cli ```. 
