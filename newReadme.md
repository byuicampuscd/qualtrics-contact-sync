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

The tool will run through the promps included in the repeat-timer library. It asks when you would like the tool to run. and how often you would like the tool to repeat. If all defaults are selected the tool will run once immediately.

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
This repo includes an auth.json.example for the user to fill out. It includes the qualtrics api token as well as login and configuration information for the users email account.


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
* A generic email if an error occured informing the recipient to check the log files


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
- Include the main steps that your code goes through to accomplish its goal
- These do not need to be overly technical, but enough for a developer to read and follow along in the code (i.e. "Use a ForEach to loop through each file" is too technical)
- Use a heading for each step

Example:

#### Read in file
Read in the CSV and parse it.

#### Manipulate the data
Filter data down to what's needed and format it.

#### Provide report
Generate CSV with formatted data and write it to the hard drive.


### Setup
- Include anything important for a developer to know if they are setting up the tool to develop it more.
- This could include instructions to install certain developer dependencies.

Example:

Make sure to include `canvas-wrapper` as a developer dependency when you need it:

```
npm i --save-dev byuitechops/canvas-wrapper
```

Here are instructions on how to set up the development server:

.....

### Unit Tests
- Explain each of your unit tests and their inputs.
- Provide all inputs used in testing so developers can use the same tests (or add on to them). For example, attach a CSV for each test case.****


### Qualtrics API notes ###
This would've been a lot easier if it weren't for the undocumented quirks of the Qualtrics API. I will record as many as I notice here. They are subject to change at any time without warning.
* EmbeddedData values can not be deleted via API once created. They can only be set to an empty string. Setting them to null or undefined throws a server err
* Adding someone to a mailing list when they are missing a 'required field' (anything outside of embeddedData) is allowed. HOWEVER you will not be able to update them until all required fields are filled.
* Adding embeddedData values with commas in them cause the API to truncate the value after the comma. I don't recall if the comma is included or truncated as well
* This tool causes a lot of 503 errors. I've written the tool to accomodate for that and run basically any failed API call twice. For the most part this works really well
* When adding a new contact, `externalDataReference` must be renamed `externalDataRef`. In addition, embeddedData properites with empty string values must be removed.
* Boolean values are stored as strings, so TRUE and true will not be evaluated as equal. This can happen if someone opens & saves the csv in excel.