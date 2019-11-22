const puppeteer = require('puppeteer');
const generateLatLongs = require("./generateLatLongs");
const helpers = require("./helperFunctions");
const timestamp = new Date().getTime();
const MAX_RETRY = 3;
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
    let MiclasicoResp = await processDataFromMiclasico();
    results = results.concat(MiclasicoResp.result);
    await MiclasicoResp.browser.close();

    retry = 0;
    let aceCafeResp = await processDataFromAcecafe();
    results = results.concat(aceCafeResp.result);
    await aceCafeResp.browser.close();

    retry = 0;
    let hemmingsResult = await processDataFromHemmings();
    results = results.concat(hemmingsResult.result);
    await hemmingsResult.browser.close();

    retry = 0;
    let everyCarShowRes = await processDataFromEveryCarShow();
    results = results.concat(everyCarShowRes.result);
    await everyCarShowRes.browser.close();

    console.log("Total " + results.length + " events pulled.");

    csvWriter
        .writeRecords(results)
        .then(() => {
            console.log('The CSV file was written successfully');
            generateLatLongs({timestamp: timestamp});
        });
}

init();

async function processDataFromEveryCarShow() {
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
    return await getDataFromEveryCarShow(page, browser, []);
}

async function getDataFromEveryCarShow(page, browser, results) {
    try {
        await page.goto('http://everycarshow.com/events/');
        console.log("started fetching data from  http://everycarshow.com/events/");
        var currentPage = 1;
        let eventsEl = (await page.$$(".tribe-events-list .tribe-events-loop"));
        let events = [];

        if (eventsEl && eventsEl[0]) {
            events = eventsEl[0];
        } else {
            // if page doesn't contain events then skip it
            return {
                'result': [],
                'browser': browser
            }
        }

        // loop while we have events
        while (events) {

            // get events urls from page            
            let urls = await page.evaluate(() => {
                let newUrls = [];
                let items = document.querySelectorAll('.tribe-events-list-event-title .tribe-event-url');
                items.forEach((item) => {
                    newUrls.push(item.getAttribute('href'));
                });
                return newUrls;
            });

            // visit each page and extract information 
            for (let i = 0; i < urls.length; i++) {
                await page.goto(urls[i], { waitUntil: 'domcontentloaded'});

                await new Promise(resolve => setTimeout(resolve, 2000));

                let startDate = "", endDate = "", title = "", description = "";
                let location = "", contactPhone = "", contactEmail = "";

                // get title
                let titleEl = await page.$$('.tribe-events-single-event-title');
                if (titleEl && titleEl[0]) {
                    title = await (await titleEl[0].getProperty('innerText')).jsonValue();
                }

                // get description
                description = await page.evaluate(async () => {
                    let descEl = document.querySelector('.tribe-events-single-event-description');
                    if (descEl) {
                        let desc = descEl.innerText;
                        desc = desc.replace("Facebook\nTwitter\nGoogle+\nEmail", "");
                        return desc;
                    } else {
                        return "";
                    }
                });

                // get event start and end date
                let fullStartDateEl = "", fullEndDateEl = "";
                let fullDateText = "";
                fullStartDateEl = await page.$$('.tribe-events-abbr.tribe-events-start-date.published.dtstart');
                if (fullStartDateEl && fullStartDateEl[0]) {
                    let fullStartDateText = await (await fullStartDateEl[0].getProperty('innerText')).jsonValue();
                    fullStartDateText = fullStartDateText.substring(0, fullStartDateText.indexOf("Recurring Event")-2).trim()
                    
                    let timeEl = await page.$$('.tribe-events-abbr.tribe-events-start-time.published.dtstart');
                    let timeText = "";
                    if (timeEl && timeEl[0]) {
                        timeText = await (await timeEl[0].getProperty('innerText')).jsonValue();
                    }

                    fullDateText = fullStartDateText + " " + timeText;
                    [startDate, endDate] = helpers.getStartAndEndDates(fullDateText);
                } else {
                    fullStartDateEl = await page.$$('.tribe-events-abbr.tribe-events-start-datetime.published.dtstart');
                    fullEndDateEl = await page.$$('.tribe-events-abbr.dtend');
                    if (fullStartDateEl && fullStartDateEl[0]) {
                        fullDateText += await (await fullStartDateEl[0].getProperty('innerText')).jsonValue();
                    }
                    if (fullEndDateEl && fullEndDateEl[0]) {
                        fullDateText += " " +  await (await fullEndDateEl[0].getProperty('innerText')).jsonValue();
                    }
                    [startDate, endDate] = helpers.getStartAndEndDates(fullDateText);
                }

                // get location
                let venueEl = await page.$$('.tribe-venue a');
                let locationEl = await page.$$('.tribe-venue-location');
                if (locationEl && locationEl[0]) {
                    venue = await (await venueEl[0].getProperty('innerText')).jsonValue();
                    location = await (await locationEl[0].getProperty('innerText')).jsonValue();
                    location = location.replace("\n", ", ");
                    location = venue + ", " + location;
                }

                // get contactPhone                
                let contactPhoneEl = await page.$$('.tribe-organizer-tel');
                if (contactPhoneEl && contactPhoneEl[0]) {
                    contactPhone = await (await contactPhoneEl[0].getProperty('innerText')).jsonValue();
                } else {
                    contactPhoneEl = await page.$$('.tribe-venue-tel > a');
                    if (contactPhoneEl && contactPhoneEl[0]) {
                        contactPhone = await (await contactPhoneEl[0].getProperty('innerText')).jsonValue();
                    }
                }

                // get contactEmail                
                let contactEmailEl = await page.$$('.tribe-organizer-email a');
                if (contactEmailEl && contactEmailEl[0]) {
                    contactEmail = await (await contactEmailEl[0].getProperty('innerText')).jsonValue();
                }

                results.push({
                    "platform": "http://everycarshow.com/events/",
                    "title": title,
                    "location": location,
                    "description": description,
                    "contactPhone": contactPhone,
                    "startDate": startDate,
                    "endDate": endDate,
                    "photoUrl": "",
                    "eventUrl": urls[i],
                    "contactEmail": contactEmail,
                })
            }

            // go to next page
            currentPage++;
            await page.goto(`http://everycarshow.com/events/list/?tribe_paged=${currentPage}&tribe_event_display=list`);
            await new Promise(resolve => setTimeout(resolve, 2000));
            events = (await page.$$(".tribe-events-list .tribe-events-loop"))[0];
        };
    } catch (error) {
        console.log(error);
        if (error.name === "TimeoutError" && ++retry <= MAX_RETRY) {
            browser.close();
            console.log("Timeout error retrying....")
            retryResponse = (await processDataFromEveryCarShow());
            results = retryResponse.result;
            retryResponse.browser.close();
        }
        browser.close();
    }
    console.log(results);
    console.log("pulled " + results.length + " events");
    return {
        'result': results,
        'browser': browser
    }
}

async function getDataFromHemmings(page, browser, results) {
    try {
        await page.goto('https://www.hemmings.com/calendar');
        console.log("started fetching data from https://www.hemmings.com/calendar");

        let closeBtn = await page.$x("//button[contains(text(), 'No Thanks')]");
        if (closeBtn && closeBtn[0]) {
            await closeBtn[0].click();
        }

        var eventCount = 0;
        let events = (await page.$$("#results_list .mevent_box"));

        if (!events) {
            return;
        }

        // loop while we have events
        while (events.length) {

            // get events urls from page            
            let urls = await page.evaluate(() => {
                let newUrls = [];
                let items = document.querySelectorAll('.mevent_box .event_detail .event_title a');
                items.forEach((item) => {
                    newUrls.push("https://www.hemmings.com" + item.getAttribute('href'));
                });
                return newUrls;
            });

            // visit each page and extract information 
            for (let i = 0; i < urls.length; i++) {
                await page.goto(urls[i], { waitUntil: 'domcontentloaded' });

                await new Promise(resolve => setTimeout(resolve, 2000));

                let startDate = "", endDate = "", title = "", description = "";
                let location = "", contactPhone = "";

                // get title
                let titleEl = await page.$$('#event_details h1.summary');
                if (titleEl && titleEl[0]) {
                    title = await (await titleEl[0].getProperty('innerText')).jsonValue();
                }

                // get description
                let descriptionEl = await page.$$('#event_details .description p');
                if (descriptionEl && descriptionEl[0]) {
                    description = await (await descriptionEl[0].getProperty('innerText')).jsonValue();
                }

                // get event start and end date
                let fullDateEl = await page.$$('#event_details h1+h3');
                if (fullDateEl && fullDateEl[0]) {
                    let fullDateText = await (await fullDateEl[0].getProperty('innerText')).jsonValue();
                    [startDate, endDate] = helpers.getStartAndEndDates(fullDateText);
                }

                // get location
                let locationEl = await page.$$('#event_details .location');
                if (locationEl && locationEl[0]) {
                    location = await (await locationEl[0].getProperty('innerText')).jsonValue();
                }

                // get contactPhone           
                let contactPhoneEl = await page.$$('#event_details .dtstart');
                if (contactPhoneEl && contactPhoneEl[0]) {
                    contactPhoneText = await (await contactPhoneEl[0].getProperty('innerText')).jsonValue();
                    let contactPhoneMatches = contactPhoneText.match(/[0-9]{10}|[0-9]{3}-[0-9]{3}-[0-9]{4}/g);
                    let i = 0;
                    while (contactPhoneMatches && contactPhoneMatches[i]) {
                        contactPhone += contactPhoneMatches[i];
                        i++;
                        if (contactPhoneMatches[i]) {
                            contactPhone += ", ";
                        }
                    }
                }

                results.push({
                    "platform": "https://www.hemmings.com/calendar",
                    "title": title,
                    "location": location,
                    "description": description,
                    "contactPhone": contactPhone,
                    "startDate": startDate,
                    "endDate": endDate,
                    "photoUrl": "",
                    "eventUrl": urls[i],
                    "contactEmail": "",
                })
            }

            // go to next page
            eventCount += urls.length;
            await page.goto(`https://www.hemmings.com/calendar?start=${eventCount}`);
            await new Promise(resolve => setTimeout(resolve, 2000));
            events = (await page.$$("#results_list .mevent_box"));
        };
    } catch (error) {
        console.log(error);
        if (error.name === "TimeoutError" && ++retry <= MAX_RETRY) {
            browser.close();
            console.log("Timeout error retrying....")
            retryResponse = (await processDataFromHemmings());
            results = retryResponse.result;
            retryResponse.browser.close();
        }
        browser.close();
    }
    console.log(results);
    console.log("pulled " + results.length + " events");
    return {
        'result': results,
        'browser': browser
    }
}

async function getDataFromMiclasico(page, browser) {
    let results = [];

    try {
        await page.goto('https://www.miclasico.com/calendario');

        // get all events urls from current page            
        let eventUrls = await page.evaluate(() => {
            let newUrls = [];
            let items = document.querySelectorAll('.ev_ul .ev_td_li .ev_link_row');
            items.forEach((item) => {
                newUrls.push("https://www.miclasico.com" + item.getAttribute('href'));
            });
            return newUrls;
        });

        for (var i = 0; i < eventUrls.length; i++) {
            let title = "", startDate = "", endDate = "", location = "";
            let contactEmail = "", contactPhone = "", photoUrl = "";

            await page.goto(eventUrls[i], { waitUntil: 'domcontentloaded' });

            await new Promise(resolve => setTimeout(resolve, 2000));

            // get title
            let titleEl = await page.$$('.jev_evdt_header .uk-flex h3');
            if (titleEl && titleEl[0]) {
                title = await (await titleEl[0].getProperty('innerText')).jsonValue();
            }

            // get event start and end date
            let fullDateEl = await page.$$('.jev_evdt_header > div:nth-child(3)');
            if (fullDateEl && fullDateEl[0]) {
                let fullDateText = await (await fullDateEl[0].getProperty('innerText')).jsonValue();

                // convert month to english language
                let spanishMonthMatch = fullDateText.match(/\b(Enero|Febrero|Marzo|Abril|Mayo|Junio|Julio|Agosto|Septiembre|Octubre|Noviembre|Diciembre)\b/ig);
                if (spanishMonthMatch && spanishMonthMatch[0]) {
                    let spanishMonth = spanishMonthMatch[0];
                    let re = new RegExp(spanishMonth, "g");
                    let englishMonth = helpers.convertMonthFromSpanishToEnglish(spanishMonth);
                    fullDateText = fullDateText.replace(re, englishMonth);
                }

                let monthDatesMatch = fullDateText.match(/\b[0-9]{1,2}(th|nd|rd|st)?\s(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|(Nov|Dec)(?:ember)?)\b/ig);
                let yearsMatch = fullDateText.match(/\b[0-9]{4}\b/g);
                let timesMatch = fullDateText.match(/\b([0-9]{1,2})(:?[0-9]{1,2})?\s?(a.?m.?|p.?m.?)\b/ig);

                if (!(monthDatesMatch && monthDatesMatch[0])) {
                    monthDatesMatch = fullDateText.match(/\b(Enero|Febrero|Marzo|Abril|Mayo|Junio|Julio|Agosto|Septiembre|Octubre|Noviembre|Diciembre)\s[0-9]{1,2}(th|nd|rd|st)?\b/ig);
                }

                if (monthDatesMatch && monthDatesMatch[0]) {
                    startDate = monthDatesMatch[0];
                    if (yearsMatch && yearsMatch[0]) {
                        startDate += " " + yearsMatch[0];
                    }

                    if (monthDatesMatch[1]) {
                        endDate = monthDatesMatch[1];
                    } else {
                        if (fullDateText.includes("to") || fullDateText.includes("-")) {
                            endDate = monthDatesMatch[0];
                        }
                    }

                    if (fullDateText.includes("to") || fullDateText.includes("-")) {
                        if (yearsMatch && yearsMatch[1]) {
                            endDate += " " + yearsMatch[1];
                        } else {
                            endDate += " " + yearsMatch[0];
                        }
                    }

                    if (timesMatch && timesMatch[0] && timesMatch[1]) {
                        startDate += " " + timesMatch[0];
                        endDate += " " + timesMatch[1];
                    }
                }

            }

            // get address
            location = await page.evaluate(() => {
                let eventHTML = document.querySelector('.jev_eventdetails_body').innerHTML;
                if (eventHTML) {
                    let address = eventHTML.substring(eventHTML.indexOf("</strong>") + 9, eventHTML.indexOf("<br>"));
                    return address;
                } else {
                    return "";
                }
            });


            // get contact phone
            contactPhone = await page.evaluate(() => {
                let eventEl = document.querySelector(".jev_evdt_header");
                if (eventEl) {
                    let contactPhoneMatch = eventEl.innerText.match(/\d{3}\s?\d{2,3}\s?\d{2,3}(\s\d{2})?(\d{1})?/g);
                    if (contactPhoneMatch) {
                        return contactPhoneMatch[0];
                    }
                }
                return "";
            });

            // get contact email
            contactEmail = await page.evaluate(() => {
                let contactEmailEl = document.querySelector('.uk-icon-envelope-o + strong + span');
                if (contactEmailEl) {
                    return contactEmailEl.innerText;
                } else {
                    return "";
                }
            });

            // get photoUrl
            photoUrl = await page.evaluate(() => {
                let photoEl = document.querySelector('.jev_imagethumb1');
                if (photoEl) {
                    return "https:" + photoEl.getAttribute("src");
                } else {
                    return "";
                }
            });


            results.push({
                "platform": "https://www.miclasico.com/calendario",
                "title": title,
                "description": "",
                "location": location,
                "contactPhone": contactPhone,
                "startDate": startDate,
                "endDate": endDate,
                "photoUrl": photoUrl,
                "eventUrl": eventUrls[i],
                "contactEmail": contactEmail,
            });
        }
    } catch (error) {
        console.log(error);
        if (error.name === "TimeoutError" && ++retry <= MAX_RETRY) {
            browser.close();
            console.log("Timeout error retrying....")
            retryResponse = (await processDataFromMiclasico());
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

async function getDataFromAceCafe(page, browser) {
    const URLS = ['https://london.acecafe.com/meets/?cm=1&cy=2019&ct=cars', 'https://london.acecafe.com/meets/?cm=2&cy=2019&ct=cars',
        'https://london.acecafe.com/meets/?cm=3&cy=2019&ct=cars', 'https://london.acecafe.com/meets/?cm=4&cy=2019&ct=cars',
        'https://london.acecafe.com/meets/?cm=5&cy=2019&ct=cars', 'https://london.acecafe.com/meets/?cm=6&cy=2019&ct=cars',
        'https://london.acecafe.com/meets/?cm=7&cy=2019&ct=cars', 'https://london.acecafe.com/meets/?cm=8&cy=2019&ct=cars',
        'https://london.acecafe.com/meets/?cm=9&cy=2019&ct=cars', 'https://london.acecafe.com/meets/?cm=10&cy=2019&ct=cars',
        'https://london.acecafe.com/meets/?cm=11&cy=2019&ct=cars', 'https://london.acecafe.com/meets/?cm=12&cy=2019&ct=cars'

    ];
    let results = [];
    try {
        for (let i = 0; i < URLS.length; i++) {
            await page.goto(URLS[i], { waitUntil: 'domcontentloaded' });
            await new Promise(resolve => setTimeout(resolve, 2000));
            let pageResults = [];

            pageResults = await page.evaluate(() => {
                let events = document.querySelectorAll(".postlist .zp_accordion.panel-group");
                let eventResults = [];

                for (let j = 0; j < events.length; j++) {
                    let eventBox = events[j];
                    let title = "", startDate = "", endDate = "", location = "";
                    let contactEmail = "", description = "", eventURL = "";

                    // get title
                    let titleEl = eventBox.querySelector(".label-container .label-inner h3.label")
                    if (titleEl) {
                        title = titleEl.innerText;
                    }

                    // get description and event url
                    let descriptionEl = eventBox.querySelector(".content-inner .atc_description");
                    if (descriptionEl) {
                        description = descriptionEl.innerText;
                        eventURL = description.substring(description.indexOf("https"), description.length).trim();
                        description = description.replace(eventURL, "").trim();
                    }

                    // get location
                    let locationEl = eventBox.querySelector(".content-inner .atc_location");
                    if (locationEl) {
                        location = locationEl.innerText;
                    }

                    // get contact email
                    let contactEmailEl = eventBox.querySelector(".content-inner .atc_organizer_email");
                    if (contactEmailEl) {
                        contactEmail = contactEmailEl.innerText;
                    }


                    // get start and end dates
                    let startDateEl = eventBox.querySelector(".content-inner .atc_date_start");
                    let endDateEl = eventBox.querySelector(".content-inner .atc_date_start");
                    let timesMatches = description.match(/\d{2}.\d{2}/g);
                    if (startDateEl) {
                        startDate = startDateEl.innerText;
                        startDate = startDate.substring(0, startDate.length - 9);
                        endDate = endDateEl.innerText;
                        endDate = endDate.substring(0, endDate.length - 9);

                        if (timesMatches && timesMatches[0]) {
                            startDate += " " + timesMatches[0];
                        }
                        if (timesMatches && timesMatches[1]) {
                            endDate += " " + timesMatches[1];
                        }
                    }

                    eventResults.push({
                        "platform": "https://london.acecafe.com/meets/",
                        "title": title,
                        "description": description,
                        "location": location,
                        "contactPhone": "",
                        "startDate": startDate,
                        "endDate": endDate,
                        "photoUrl": "",
                        "eventUrl": eventURL,
                        "contactEmail": contactEmail,
                    });
                }
                return eventResults;
            });
            results = results.concat(pageResults);
        }
    } catch (error) {
        console.log(error);
        if (error.name === "TimeoutError" && ++retry <= MAX_RETRY) {
            browser.close();
            console.log("Timeout error retrying....")
            retryResponse = (await processDataFromAcecafe());
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

async function processDataFromHemmings() {
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

    return await getDataFromHemmings(page, browser, []);
}

async function processDataFromMiclasico() {

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

    return await getDataFromMiclasico(page, browser);

}

async function processDataFromAcecafe() {
    const browser = await puppeteer.launch({
        headless: false,
        networkIdleTimeout: 10000,
        waitUntil: 'networkidle0',
        args: ['--start-maximized', '--window-size=1366,700']
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1366, height: 700 });

    return await getDataFromAceCafe(page, browser);
}