const puppeteer = require('puppeteer');
const generateLatLongs = require("./generateLatLongs");
const timestamp = new Date().getTime();
const MAX_RETRY = 3;
const TOTAL_MONTHS_TO_SCRAP_FOR = 5;
var retry = 0;
const createCsvWriter = require('csv-writer').createObjectCsvWriter;

const csvWriter = createCsvWriter({
    path: `output_${timestamp}.csv`,
    header: [
        { id: 'platform', title: 'platform' },
        { id: 'title', title: 'title' },
        { id: 'location', title: 'location' },
        { id: 'description', title: 'description' },
        { id: 'contactPhone', title: 'contactPhone' },
        { id: 'startDate', title: 'startDate' },
        { id: 'endDate', title: 'endDate' },
        { id: 'photoUrl', title: 'photoUrl' },
        { id: 'eventUrl', title: 'eventUrl' },
        { id: 'contactEmail', title: 'contactEmail' },
    ]
});

async function init() {
    let results = [];

    retry = 0;
    let flaCarsShows = await processDataFromFlaCarsShows();
    results = results.concat(flaCarsShows.result);
    await flaCarsShows.browser.close();

    console.log("Total " + results.length + " events pulled.");

    csvWriter
        .writeRecords(results)
        .then(() => {
            console.log('The CSV file was written successfully');
            generateLatLongs({timestamp: timestamp});
        });
}

// init();

async function getDataFromFlaCarsShows(page, browser) {
    let results = [];
    let currentDate = new Date();
    let currentMonth = currentDate.getMonth() + 1;
    let currentMonthText = ('0' + currentMonth).slice(-2);
    let currentYear = currentDate.getFullYear();
    let months_count = TOTAL_MONTHS_TO_SCRAP_FOR;    // total number of months to scrap for

    try {
        let pageURL = `https://flacarshows.com/events/event/on/${currentYear}`;
        await page.goto(pageURL, {waitUntil: 'domcontentloaded'});
        await page.waitForSelector('#left-area .event');
        let eventsInCurrentYear = await page.$$("#left-area .event");

        // loop through year while we have events in current year
        while (eventsInCurrentYear.length) {
            // loop through months
            while (currentMonth <= 12 && months_count > 0) {
                pageURL = `https://flacarshows.com/events/event/on/${currentYear}/${currentMonthText}`;
                await page.goto(pageURL, { waitUntil: 'domcontentloaded' });

                let currentDates = await page.evaluate(() => {
                    let datesEl = [].slice.call(document.querySelectorAll('#wp-calendar tbody tr > td.event'));
                    if (datesEl.length > 0) {
                        return datesEl.map(dateEl => {
                            let date = dateEl.innerText;
                            date = ('0' + date).slice(-2);
                            return date;
                        })
                    } else {
                        return [];
                    }
                });

                // loop through dates
                for (let i = 0; i < currentDates.length; i++) {
                    pageURL = `https://flacarshows.com/events/event/on/${currentYear}/${currentMonthText}/${currentDates[i]}`;
                    await page.goto(pageURL, {waitUntil: 'domcontentloaded'});

                    // get urls of all events on current page
                    let eventUrls = await page.evaluate(() => {
                        let newUrls = [];
                        let items = document.querySelectorAll('#left-area .event .entry-title > a');
                        items.forEach((item) => {
                            let url = item.getAttribute('href');
                            url = url.replace(/\s/g, "%20");
                            newUrls.push(url);
                        });
                        return newUrls;
                    });

                    // visit each event
                    for (let j = 0; j < eventUrls.length; j++) {
                        await page.goto(eventUrls[j], {waitUntil: 'domcontentloaded'});

                        // scrap data from event page
                        let title = "", description = "", startDate = "", endDate = "", location = "";
                        let contactEmail = "", contactPhone = "", photoUrl = "";

                        // get title
                        let titleEl = await page.$$('#left-area .event h1.entry-title');
                        if (titleEl && titleEl[0]) {
                            title = await (await titleEl[0].getProperty('innerText')).jsonValue();
                        }

                        // get description
                        let descriptionEl = await page.$$('#left-area .event .eo-event-venue-description p');
                        if (descriptionEl && descriptionEl[0]) {
                            description = await (await descriptionEl[0].getProperty('innerText')).jsonValue();
                        }

                        // get description
                        photoUrl = await page.evaluate(() => {
                            let photoEl = document.querySelector('#left-area .event .eo-event-venue-thumbnail img');
                            if (photoEl) {
                                return photoEl.getAttribute("src");
                            } else {
                                return "";
                            }
                        });

                        // get start date
                        let startDateEl = await page.$$('#left-area .event .eo-event-meta li:first-child');
                        if (startDateEl && startDateEl[0]) {
                            startDate = await (await startDateEl[0].getProperty('innerText')).jsonValue();
                            startDate = startDate.replace("Start:", "").trim();
                        }

                        // get end date
                        let endDateEl = await page.$$('#left-area .event .eo-event-meta li:nth-child(2)');
                        if (endDateEl && endDateEl[0]) {
                            endDate = await (await endDateEl[0].getProperty('innerText')).jsonValue();
                            endDate = endDate.replace("End:", "").trim();
                        }

                        // get location
                        let venueEl = await page.$$('#left-area .event .eo-event-meta li:nth-child(3)');
                        let addressEl = await page.$$('#left-area .event .eo-event-meta li:nth-child(4)');
                        if (addressEl && addressEl[0]) {
                            let address = await (await addressEl[0].getProperty('innerText')).jsonValue();
                            address = address.replace("Address:", "");
                            let venue = "";
                            if (venueEl && venueEl[0]) {
                                venue = await (await venueEl[0].getProperty('innerText')).jsonValue();
                                venue = venue.replace("Venue:", "");
                            }
                            location = venue + ", " + address;
                        }

                        // get contact phone
                        contactPhone = await page.evaluate(() => {
                            eventHTML = document.querySelector('#left-area .event').innerHTML;
                            if (eventHTML.includes("Phone:")) {
                                eventHTML = eventHTML.substring(eventHTML.indexOf("Phone:"));
                                return eventHTML.substring(22, eventHTML.indexOf("</span></li>"));
                            } else {
                                return "";
                            }
                        });

                        // get contact phone
                        contactEmail = await page.evaluate(() => {
                            eventHTML = document.querySelector('#left-area .event').innerHTML;
                            if (eventHTML.includes("Email:")) {
                                eventHTML = eventHTML.substring(eventHTML.indexOf("Email") + 38)
                                return eventHTML.substring(0, eventHTML.indexOf('>') - 1)
                            } else {
                                return "";
                            }
                        });

                        results.push({
                            "platform": "https://flacarshows.com/events/event/",
                            "title": title,
                            "description": description,
                            "location": location,
                            "contactPhone": contactPhone,
                            "startDate": startDate,
                            "endDate": endDate,
                            "photoUrl": photoUrl,
                            "eventUrl": eventUrls[j],
                            "contactEmail": contactEmail,
                        });
                    }
                }

                // increase month
                currentMonth++;
                currentMonthText = ('0' + currentMonth).slice(-2);
                // decrease months count
                months_count--;
            }
            currentYear++;
            currentMonth = 1;   // reset month
            currentMonthText = ('0' + currentMonth).slice(-2);
            pageURL = `https://flacarshows.com/events/event/on/${currentYear}`;
            await page.goto(pageURL, {waitUntil: 'domcontentloaded'});
            eventsInCurrentYear = await page.$$("#left-area .event");
        }
    } catch (error) {
        console.log(error);
        if (error.name === "TimeoutError" && ++retry <= MAX_RETRY) {
            browser.close();
            console.log("Timeout error retrying....")
            retryResponse = (await processDataFromFlaCarsShows());
            results = retryResponse.result;
            retryResponse.browser.close();
        }
        browser.close();
    }
    console.log(results)
    console.log("pulled " + results.length + " results");
    return {
        'result': results,
        'browser': browser
    }
}

async function processDataFromFlaCarsShows() {
    const browser = await puppeteer.launch({
        headless: false,
        networkIdleTimeout: 10000,
        waitUntil: 'networkidle0',
        args: ['--start-maximized', '--window-size=1366,700']
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1366, height: 700 });

    await page.setRequestInterception(true);
    
    page.on('request', (req) => {
        if(req.resourceType() == 'stylesheet' || req.resourceType() == 'font' || req.resourceType() == 'image'){
            req.abort();
        }
        else {
            req.continue();
        }
    });

    return await getDataFromFlaCarsShows(page, browser);
}