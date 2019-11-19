const fetch = require('node-fetch');
var parser = require('xml2json');
const csvtojson = require('csvtojson');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const APP_CODE = "uVpeMH7xQCESU28Te7NHvw";
const APP_ID = "fcCDTt5BOM4w825JePpQ";
let timestamp = "";

const csvWriter = createCsvWriter({
    path: `final_output_${timestamp}.csv`,
    header: [
        { id: 'platform', title: 'platform' },
        { id: 'title', title: 'title' },
        { id: 'description', title: 'description' },
        { id: 'contactPhone', title: 'contactPhone' },
        { id: 'startDate', title: 'startDate' },
        { id: 'endDate', title: 'endDate' },
        { id: 'photoUrl', title: 'photoUrl' },
        { id: 'eventUrl', title: 'eventUrl' },
        { id: 'contactEmail', title: 'contactEmail' },
        { id: 'location', title: 'location' },
        { id: 'latitude', title: 'latitude' },
        { id: 'longitude', title: 'longitude' },
    ]
});




async function generateLatLongs(options) {
    console.log('hi')
    try {
        // extract csv file records into array
        let csvRecords = [];
        let csvFile = "output_" + options.timestamp + ".csv";
        await csvtojson()
        .fromFile(csvFile)
        .then((data) => {
            csvRecords = data;
        });

        // extract and prepare addresses for sending to geocoder api
        let geocoderData = "recId|searchText\n";
        for (let i = 0; i < csvRecords.length; i++) {
            geocoderData += (i+1) + "|" + '"' + csvRecords[i].location + '"' +"\n";
        }

        // get request id from geocoder api for checking status of results and getting results
        let requestId = await getRequestId(geocoderData);

        // check status of resutls
        let status = await checkStatus(requestId);
        while (status !== "completed") {
            await new Promise(resolve => setTimeout(resolve, 5000));    // wait 5 seconds
            status = await checkStatus(requestId);
        }

        // when status is completed get results and convert to json
        let geoCoderApiResults = await getData(requestId);
        await csvtojson(geoCoderApiResults)
            .fromString(geoCoderApiResults)
            .then((data) => {
                geoCoderApiResults = data;
            });

        // add latitude and longitude to each csv record
        for (let i = 0; i < csvRecords.length; i++) {
            csvRecords[i].latitude = geoCoderApiResults[i].latitude;
            csvRecords[i].longitude = geoCoderApiResults[i].longitude;
        }

        // write records to new csv file
        timestamp = options.timestamp;
        csvWriter
        .writeRecords(csvRecords)
        .then(() => {
            console.log('Latitude and longitude of all addresses are generated.');
        });
    } catch (error) {
        console.log(error);
    }
}

function getRequestId(data){
    const options = {
        method: 'POST',
        body: data,
        headers: {'Content-Type': 'text/plain', 'charset':'UTF-8'}
    }

    return fetch(`https://batch.geocoder.api.here.com/6.2/jobs?app_code=${APP_CODE}&app_id=${APP_ID}&action=run&header=true&inDelim=|&outDelim=,&outCols=recId,latitude,longitude,locationLabel&outputcombined=true&language=de-DE`, options)
        .then(res => res.text())
        .then(body => {
            let data = parser.toJson(body, { object: true });
            let RequestId = data["ns2:SearchBatch"].Response.MetaInfo.RequestId
            return RequestId;
        });
}  

function checkStatus(requestId) {
    return fetch(`https://batch.geocoder.api.here.com/6.2/jobs/${requestId}?action=status&app_id=${APP_ID}&app_code=${APP_CODE}`)
        .then(res => res.text())
        .then(body => {
            let data = parser.toJson(body, { object: true });
            let status = data["ns2:SearchBatch"].Response.Status;
            return status;
        });
}

function getData(requestId) {
    return fetch(`https://batch.geocoder.api.here.com/6.2/jobs/${requestId}/result?outputcompressed=false&app_id=fcCDTt5BOM4w825JePpQ&app_code=uVpeMH7xQCESU28Te7NHvw`)
        .then(res => res.text())
        .then(body => {
            return body;
        });
}

module.exports =  {generateLatLongs:generateLatLongs};