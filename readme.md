# Qualtrics-contacts-sync

## Purpose
This module was built at the request of Aaron Ball. It was requested that we build a tool that would automate the synchronization of csv lists on the iDrive with mailing lists in Qualtrics. The tool uses a configuration file to know which lists to sync, and generates lists of changes made each day. It saves a hash of each file daily allowing the tool to quickly determine if no changes were made to the file. It emails a specified user whenever an error occurs to alert them.


## How to Install

This module is not meant to be used as a dependency. Installing globally has not been tested, and this may break the tool.

To install globally, open the console and type:

```
npm install -g qualtrics-contact-sync
```


## How to Run

To start the tool, type this in the console:

```node main```


## Inputs

The tool will run through the prompts included in the repeat-timer library. It asks when you would like the tool to run. and how often you would like the tool to repeat. If all defaults are selected the tool will run once immediately.

The Tool requires the following files:
* settings.json 
* auth.json
* config.csv


### Settings.json
The settings file allows the user to set the location & title of the config file. FilePath & logPath which directory contains the individual csv & log files.
```js
{
    "configLocation": "./test/config.csv",
    "logPath": "./test/reports/",
    "filePath": "./test/"
}
```

### Auth.json
This repository includes an auth.json.example for the user to fill out. It includes the Qualtrics api token as well as login and configuration information for the users email account.


### Config.csv
The hash value is updated automatically by the tool. The Library ID isn't by the tool, but Aaron seemed to want it in there.

| csv | MailingListID | LibraryID | hash |
|-----|---------------|-----------|------|
|QualtricsSync-fileName1.csv | ML_1a1a1a1a1a | GR_1a1a1a1a1a | abc123 |
|QualtricsSync-fileName2.csv | ML_2b2b2b2b2b | GR_2b2b2b2b2b | def456 |
|QualtricsSync-fileName3.csv | ML_3c3c3c3c3c | GR_3c3c3c3c3c | ghi789 |


## Outputs

The tool has the following outputs:
* Generic log detailing the runtime of the tool and amount of changes per csv file (.TXT)
* One Detailed log per csv file containing each altered contact (.JSON)
* A generic email if an error occurred informing the recipient to check the log files


### Generic Log
| Date | Timestamp ||||
|---------------|-----------------------|----------|------------|------------|
| FileName1.csv | Changes to be Made: 4 | Added: 0 | Updated: 4 | Deleted: 0 |
| FileName2.csv | Changes to be Made: 17 | Added: 10 | Updated: 2 | Deleted: 5 |
| ElapsedTime |


### Detailed Log
This will be a TXT file containing JSON data. The exact object is subject to change and will be updated upon completion.
```js
{
"To Add": [],
"To Update": [],
"To Delete": [
   {
      "id": "MLRP_manymuchnumbers",
      "firstName": "Larry",
      "lastName": "Biglot",
      "email": "someone@somewhere.com",
      "externalDataReference": "unique_id",
      "embeddedData": {
         "age": "47",
         "gender": "male",
         "country": "russia"
      },
      "language": null,
      "unsubscribed": false,
      "responseHistory": [],
      "emailHistory": []
   }
]
}
```


## Requirements
**List all of the business requirements for the project. What are the expectations for the project? What does it need to be able to do? Example:**

- Must accurately synchronize mailing lists with Qualtrics contact lists via API.
- Must run daily with minimal human interaction.
- Must keep accurate logs to allow quick and accurate debugging


# TODO (everything below)
## Development

### Execution Process
#### Read Config file
Read in the config CSV, sanitize it, parse it into the csvFiles object. Then loop through each csv file listed in the config file.

#### Read CSV
Read, parse, and sanitize the csv file. 

### Compare hashes
Hash the JSON stringified csv file, and compare this hash to the one on the config file. If they are the same no changes have been made and the tool can skip this csv

### Format CSV contacts
Format contacts to match the object stored in Qualtrics. This is as much for the comparison equality as it is for satisfying the Qualtrics API.

### Pull contacts from Qualtrics
Many GET requests involved. Yay!

### Sort contacts
This is required for the binary search used later to find matches between the csv contacts & Qualtrics contacts.

### Compare contacts
Determine which contacts need to be added, updated, & deleted. Calls equality comparison which has been problematic in the past. If you get a funny number of contacts being added, updated, or deleted look here.

### Make API calls
Make the necessary GET, POST, and DELETE requests. An additional addPrep step is included for contacts who are to be added. It includes additional formatting and sanitizing to the contact object.

### Update Hashes on the config file
Only updates the hash is no errors occurred during the sync. That includes file level and contact level errors.

### Send an email (if an err occurred)
If ANY file, contact, or overall level error occurred, send a generic email alerting the developer.


## Setup
- The CSV's are currently located in the I-Drive. The I-Drive must be mapped to a drive on your machine in order for this tool to be able to access those files. Z: is the default, but it can be changed in settings.json
- Remember to have an auth.json file with your Qualtrics API token.
- There is a sandbox mailing list that was created for debugging/testing. Its mailingList id is not listed here for security purposes.

## Unit Tests
- Testing is done by creating a CSV file for each scenario you would like to test and appending it to a testing config.csv file. Remember to update setting.json to read your testing files and NOT the I-Drive.


# Qualtrics API notes #
This would've been a lot easier if it weren't for the undocumented quirks of the Qualtrics API. I will record as many as I notice here. They are subject to change at any time without warning. Good Luck!

* EmbeddedData values can not be deleted via API once created. They can only be set to an empty string. Setting them to null or undefined throws a server err
* Adding someone to a mailing list when they are missing a 'required field' (anything outside of embeddedData) is allowed. HOWEVER you will not be able to update them until all required fields are filled (The tool will not allow you to add these contacts, but the API will).
* Adding embeddedData values with commas in them cause the API to truncate the value, deleting everything after the comma. I don't recall if the comma is included or not.
* Qualtrics servers like to throw 500 errors at random. Running the same API call moments later usually fixes the issue, so I'm not sure why it happens so often. This is why calls to the API wrapped in the async library's `retry` & `retryable` methods.
* When adding a new contact, `externalDataReference` must be renamed `externalDataRef`. In addition, embeddedData properties with empty string values must be removed.
* Boolean values are stored as strings, so `TRUE` and `true` ARE NOT the same. This can happen if someone opens & saves the csv in excel.
* Adding a contact with an empty `embeddedData` object to Qualtrics will result in the embeddedData field being set to `null`. This can make it difficult to compare contacts b/c Object.Keys() breaks on null.
* The embeddedData property MUST contain a JSON object. Sending `null` or `''` will make the request fail.