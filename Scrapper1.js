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
    let NorcalRes = await getDataFromNorcalcarculture();
    results = results.concat(NorcalRes.result);
    await NorcalRes.browser.close();

    retry = 0;
    let atodomotoRep = await processDataFromAtodomotor();
    results = results.concat(atodomotoRep.result);
    await atodomotoRep.browser.close();

    retry = 0;
    let SocalcarcultureResp = await processDataFromSocalcarculture();
    results = results.concat(SocalcarcultureResp.result);
    await SocalcarcultureResp.browser.close();

    retry = 0;
    let DuponRes = await getDataFromhttpsDupontregistry();
    results = results.concat(DuponRes.result);
    await DuponRes.browser.close();

    retry = 0;
    let thermotorRes = await processDataFromThemotoringdiary();
    results = results.concat(thermotorRes.result);
    await thermotorRes.browser.close();

    console.log("Total " + results.length + " events pulled.");
    
    csvWriter
        .writeRecords(results)
        .then(() => {
            console.log('The CSV file was written successfully');
            generateLatLongs({timestamp: timestamp});
        });
}

init();

async function processDataFromAtodomotor() {
    const browser = await puppeteer.launch({
        headless: false,
        networkIdleTimeout: 10000,
        waitUntil: 'networkidle0',
        args: ['--start-maximized', '--window-size=1366,700']
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1366, height: 700 });

    return await getDataFromAtodomotor(page, browser, []);
}

async function processDataFromSocalcarculture() {
    const browser = await puppeteer.launch({
        headless: false,
        networkIdleTimeout: 10000,
        waitUntil: 'networkidle0',
        args: ['--start-maximized', '--window-size=1366,700']
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1366, height: 700 });

    return await getDataFromSocalCarCulture(page, browser, []);
}

async function processDataFromThemotoringdiary() {
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

    return await getDataFromThemotoringdiary(page, browser, []);
}

async function getDataFromNorcalcarculture() {
    const browser = await puppeteer.launch({
        headless: false,
        networkIdleTimeout: 10000,
        waitUntil: 'networkidle0',
        args: ['--start-maximized', '--window-size=1366,700']
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1366, height: 700 });
    let results = [];
    try {
        await page.goto('https://norcalcarculture.com/', {waitUntil: 'load'});
        console.log("Started to fetch data from https://norcalcarculture.com ");

        results = await page.evaluate(() => {
            let results = [];
            let events = document.querySelectorAll('.entry-content p');

            for (var i = 0; i < events.length; i++) {

                if (!(events[i] && events[i].querySelector("a > strong"))) {
                    continue;
                }

                let title = "", startDate = "", endDate = "", location = "";

                let eventText = events[i].innerText;

                // get title
                title = (events[i].querySelector("a > strong")).innerText;

                // get date
                // note: year is hardcoded as current year
                let date = "";
                if (eventText.indexOf("is") !== -1) {
                    date = eventText.substring(eventText.indexOf("is") + 3, eventText.lastIndexOf(" at"));
                } else {
                    date = eventText.substring(eventText.indexOf("are") + 4, eventText.lastIndexOf(" at"));
                }

                date = date.substring(date.indexOf(",")).trim();
                let startEndDates = date.match(/(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|(Nov|Dec)(?:ember)?) [0-9]{1,2}(th|nd|rd|st)?/ig);
                let startEndTimes = date.match(/[0-9]{1,2}(:?[0-9]{1,2})?(am|pm)/ig);
                let currentYear = (new Date).getFullYear();


                // parse start date
                if (startEndDates && startEndDates[0]) {
                    startDate = startEndDates[0] + " " + currentYear;
                    if (startEndTimes && startEndTimes[0]) {
                        startDate = startDate + " " + startEndTimes[0];
                    }
                }

                // parse end date
                if (startEndDates && startEndDates[0] && startEndDates[1]) {
                    endDate = startEndDates[1] + " " + currentYear;
                } else if (startEndDates && startEndDates[0]) {
                    endDate = startEndDates[0] + " " + currentYear;
                }

                if (startEndTimes && startEndTimes[1]) {
                    endDate = endDate + " " + startEndTimes[1];
                }

                // get location
                if (eventText.includes(" at ")) {
                    location = eventText.substring(eventText.lastIndexOf(" at ") + 4);
                } else if (eventText.includes(" on ")) {
                    location = eventText.substring(eventText.lastIndexOf(" on ") + 4);
                }

                results.push({
                    "platform": "https://norcalcarculture.com/",
                    "startDate": startDate,
                    "endDate": endDate,
                    "title": title,
                    "description": "",
                    "location": location,
                    "contactPhone": "",
                    "photoUrl": "",
                    "eventUrl": "",
                    "contactEmail": "",
                });
            }
            return results;
        });
    } catch (error) {
        console.log(error);
        if (error.name === "TimeoutError" && ++retry <= MAX_RETRY) {
            browser.close();
            console.log("Timeout error retrying....")
            retryResponse = (await getDataFromNorcalcarculture());
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



async function getDataFromAtodomotor(page, browser, results) {
    try {
        await page.goto('https://www.atodomotor.com/agenda/2019');

        let eventBox = await page.$$('.listBox');
        for (var i = 0; i < eventBox.length; i++) {
            let startDate = "", endDate = "", title = "";

            // get title
            let titleEl = await page.$$('.listBoxContent div[itemprop="name"]');
            if (titleEl && titleEl[i]) {
                title = await (await titleEl[i].getProperty('innerText')).jsonValue();
            }

            // get start and end date
            let fullDateEl = await page.$$('.listBoxContent .listBoxSubtitle');
            if (fullDateEl && fullDateEl[i]) {
                let fullDateText = await (await fullDateEl[i].getProperty('innerText')).jsonValue();
                // convert month to english language
                let spanishMonthMatch = fullDateText.match(/\b(Enero|Febrero|Marzo|Abril|Mayo|Junio|Julio|Agosto|Septiembre|Octubre|Noviembre|Diciembre)\b/ig);
                if (spanishMonthMatch && spanishMonthMatch[0]) {
                    let englishMonth = helpers.convertMonthFromSpanishToEnglish(spanishMonthMatch[0]);
                    fullDateText = fullDateText.replace(spanishMonthMatch[0], englishMonth);
                }

                let monthMatch = fullDateText.match(/\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|(Nov|Dec)(?:ember)?)\b/ig);
                let yearMatch = fullDateText.match(/\b[0-9]{4}\b/g);
                let datesMatch = fullDateText.match(/\b[0-9]{1,2}\b/g);
                if (datesMatch && datesMatch[0]) {
                    startDate = datesMatch[0];
                    if (monthMatch && monthMatch[0]) {
                        startDate += " " + monthMatch[0];
                    }
                    if (yearMatch && yearMatch[0]) {
                        startDate += " " + yearMatch[0];
                    }

                    if (datesMatch[1]) {
                        endDate = datesMatch[1];
                        if (monthMatch && monthMatch[0]) {
                            endDate += " " + monthMatch[0];
                        }
                        if (yearMatch && yearMatch[0]) {
                            endDate += " " + yearMatch[0];
                        }
                    }
                }

            }

            results.push({
                "platform": "https://www.atodomotor.com/agenda/2019",
                "title": title,
                "description": "",
                "location": "",
                "contactPhone": "",
                "startDate": startDate,
                "endDate": endDate,
                "photoUrl": "",
                "eventUrl": "",
                "contactEmail": "",
            });
        }
    } catch (error) {
        console.log(error);
        if (error.name === "TimeoutError" && ++retry <= MAX_RETRY) {
            browser.close();
            console.log("Timeout error retrying....")
            retryResponse = (await processDataFromAtodomotor());
            results = retryResponse.result;
            retryResponse.browser.close();
        }
        browser.close();
    }
    console.log("results .... ", results);
    console.log("pulled ", results.length, " results");
    return {
        'result': results,
        'browser': browser
    }

}

async function getDataFromSocalCarCulture(page, browser, results) {
    try {
        await page.goto('http://www.socalcarculture.com/events.html');

        results = await page.evaluate(() => {
            let results = [];
            let trEl = document.querySelectorAll('#Layer3 table tbody tr');
            let yearImgEl = trEl[2].querySelector("tr td > img");
            let year = yearImgEl.getAttribute("src").match(/[0-9]{4}/g)[0];

            for (let i = 3; i < trEl.length; i++) {
                // while trEl contains month image
                while (trEl[i] && trEl[i].querySelector("tr > td > img")) {
                    yearImgEl = trEl[i].querySelector("tr td > img");
                    yearEl = yearImgEl.getAttribute("src").match(/[0-9]{4}/g);

                    // if next year
                    if (yearEl && yearEl[0]) {
                        year = yearEl[0]
                        i++;
                    }

                    const monthImgEl = trEl[i].querySelector("tr td > img");
                    let month = monthImgEl.getAttribute("src").match(/(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|(Nov|Dec)(?:ember)?)/ig)[0];
                    i++;

                    // skip non event trEl
                    if (trEl[i] && !trEl[i].querySelector("tr > td > b")) {
                        while (trEl[i] && !trEl[i].querySelector("tr > td > b")) {
                            i++;
                        }
                    }

                    // while trEl contains event
                    while (trEl[i] && trEl[i].querySelector("tr > td > b")) {
                        let startDate = "", endDate = "", title = "", location = "";

                        const event = trEl[i];
                        // console.log(event);
                        let eventText = event.querySelector(":nth-child(2)").innerText;
                        // console.log(eventText);

                        // get start and end date
                        let datesText = event.querySelector(":nth-child(1) td").innerText;
                        let datesMatch = datesText.match(/[0-9]{1,2}/g);
                        let timesMatch = eventText.match(/\b([0-9]{1,2})(:?[0-9]{1,2})?\s?(a.?m.?|p.?m.?)\b/ig);
                        if (datesMatch && datesMatch[0]) {
                            startDate = datesMatch[0] + " " + month + " " + year;

                            if (timesMatch && timesMatch[0]) {
                                startDate += " " + timesMatch[0];
                            }

                            if (datesMatch[1]) {
                                endDate = datesMatch[1] + " " + month + " " + year;

                                if (timesMatch && timesMatch[1]) {
                                    endDate += " " + timesMatch[1];
                                }
                            } else {
                                endDate = datesMatch[0] + " " + month + " " + year;

                                if (timesMatch && timesMatch[1]) {
                                    endDate += " " + timesMatch[1];
                                }
                            }
                        }

                        let place = eventText.substring(0, eventText.indexOf(" - "));
                        place = place.replace("*", "");
                        eventText = eventText.substring(eventText.indexOf(" - ") + 2); // remove venue from eventText
                        let address = "";
                        if (eventText.includes(" @ ")) {
                            title = eventText.substring(0, eventText.indexOf(" @ ")).trim();
                            eventText = eventText.substring(eventText.indexOf(" @ ") + 2);    // remove title from eventText
                            address = eventText.substring(0, eventText.indexOf(" - ")).trim();
                        } else {
                            title = eventText.substring(0, eventText.indexOf(" - ")).trim();
                            eventText = eventText.substring(eventText.indexOf(" - ") + 2);    // remove title from eventText
                            address = eventText.substring(0, eventText.indexOf(" - ")).trim();
                        }

                        location = address + ", " + place;

                        results.push({
                            "platform": "http://www.socalcarculture.com/events.html",
                            "title": title,
                            "location": location,
                            "description": "",
                            "contactPhone": "",
                            "startDate": startDate,
                            "endDate": endDate,
                            "photoUrl": "",
                            "eventUrl": "",
                            "contactEmail": "",
                        });

                        i++;
                    }
                }
            }

            return results;
        });
    } catch (error) {
        console.log(error);
        if (error.name === "TimeoutError" && ++retry <= MAX_RETRY) {
            browser.close();
            console.log("Timeout error retrying....")
            retryResponse = (await processDataFromSocalcarculture());
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

async function getDataFromhttpsDupontregistry() {

    const browser = await puppeteer.launch({
        headless: false,
        networkIdleTimeout: 10000,
        waitUntil: 'networkidle0',
        args: ['--start-maximized', '--window-size=1366,700']
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1366, height: 700 });

    let results = []
    try {
        await page.goto('https://directory.dupontregistry.com/explore/?type=event&sort=upcoming', { waitUntil: 'domcontentloaded' });
        console.log("Started to fetch data from directory.dupontregistry.com ");

        var currentPage = 1;
        await page.waitForSelector('.job-manager-pagination ul li');
        var pagesCount = (await page.$$(".job-manager-pagination ul li")).length - 1;

        do {
            let urls = await page.evaluate(() => {
                let newUrls = [];
                let items = document.querySelectorAll('.results-view .grid-item .lf-item-container .lf-item.lf-item-alternate > a');
                items.forEach((item) => {
                    newUrls.push(item.getAttribute('href'));
                });
                return newUrls;
            });

            for (let i = 0; i < urls.length; i++) {
                await page.goto(urls[i], { waitUntil: 'domcontentloaded' });

                await new Promise(resolve => setTimeout(resolve, 2000));

                let startDate = "", endDate = "", title = "", description = "";
                let address = "", contactPhone = "", contactEmail = "", photoUrl = "";

                // get title
                let titleEl = await page.$$('.profile-name .case27-primary-text');
                if (titleEl && titleEl[0]) {
                    title = await (await titleEl[0].getProperty('innerText')).jsonValue();
                }

                // get description
                let descriptionEl = await page.$$('.row.cts-column-wrapper.cts-main-column .element.content-block.wp-editor-content .pf-body');
                if (descriptionEl && descriptionEl[0]) {
                    description = await (await descriptionEl[0].getProperty('innerText')).jsonValue();
                }

                // get event start and end date
                let fullStartDateEl = await page.$$('.price-or-date .value');
                let year = "";
                if (fullStartDateEl && fullStartDateEl[0]) {
                    let fullStartDateText = await (await fullStartDateEl[0].getProperty('innerText')).jsonValue();
                    year = fullStartDateText.substr(-4);
                }

                let dateEl = await page.$$('.row.cts-column-wrapper.cts-side-column .element.content-block .pf-body');
                if (dateEl && dateEl[0]) {
                    let dateText = await (await dateEl[0].getProperty('innerText')).jsonValue();
                    dateText = dateText.replace(/at/g, year);
                    startDate = dateText.replace(/\n/g, " ").substr(dateText.indexOf("Event Start"), dateText.indexOf("Event End"));
                    startDate = startDate.replace("Event Start ", "").trim();
                    endDate = dateText.replace(/\n/g, " ").substr(dateText.indexOf("Event End"), dateText.length);
                    endDate = endDate.replace("Event End ", "").trim();
                }

                // get address
                let addressEl = await page.$$('.block-field-job_location .pf-body > p:nth-child(2)');
                if (addressEl && addressEl[0]) {
                    address = await (await addressEl[0].getProperty('innerText')).jsonValue();
                }

                // get contactPhone                
                let contactPhoneEl = await page.$$('.block-field-job_phone .pf-body:nth-child(2)');
                if (contactPhoneEl && contactPhoneEl[0]) {
                    contactPhone = await (await contactPhoneEl[0].getProperty('innerText')).jsonValue();
                }

                // get contactEmail                
                contactEmail = await page.evaluate(() => {
                    let contactEmailChildEl = document.querySelector('.icon-email-outbox');
                    if (contactEmailChildEl) {
                        let email = contactEmailChildEl.parentNode.getAttribute("href");
                        email = email.replace("mailto:", "");
                    } else {
                        return "";
                    }
                });

                // get photo url
                let photoUrlText = await page.evaluate(() => {
                    let photoEl = document.querySelector('.profile-cover.parallax-bg.profile-cover-image');
                    if (photoEl) {
                        return photoEl.getAttribute("data-jarallax-original-styles");
                    } else {
                        return "";
                    }
                });

                if (photoUrlText) {
                    photoUrl = photoUrlText.replace("background-image: url('", "").replace("');", "");
                }

                results.push({
                    "platform": "https://directory.dupontregistry.com/explore/?type=event&sort=upcoming",
                    "title": title,
                    "location": address,
                    "description": description,
                    "contactPhone": contactPhone,
                    "startDate": startDate,
                    "endDate": endDate,
                    "photoUrl": photoUrl,
                    "eventUrl": urls[i],
                    "contactEmail": contactEmail,
                })
            }

            currentPage++;
            await page.goto(`https://directory.dupontregistry.com/explore/?type=event&sort=upcoming&pg=${currentPage}`);
            await new Promise(resolve => setTimeout(resolve, 2000));
        } while (currentPage <= pagesCount);

    } catch (error) {
        console.log(error);
        if (error.name === "TimeoutError" && ++retry <= MAX_RETRY) {
            browser.close();
            console.log("Timeout error retrying....")
            retryResponse = (await getDataFromhttpsDupontregistry());
            results = retryResponse.result;
            retryResponse.browser.close();
        }
        browser.close();
    }
    console.log(results);
    console.log("pulled ", results.length, " events");
    return {
        'result': results,
        'browser': browser
    }
}   

async function getDataFromThemotoringdiary(page, browser, results) {
    try {
        await page.goto('https://www.themotoringdiary.com/');
        console.log("pulling data for https://www.themotoringdiary.com/");
        var currentPage = 1;
        let events = (await page.$$("#tribe-events .tribe-events-loop .type-tribe_events"));

        // loop while we have events
        while (events.length) {

            // get all events urls from current page            
            let urls = await page.evaluate(() => {
                let newUrls = [];
                let items = document.querySelectorAll('#tribe-events .tribe-events-loop .type-tribe_events a.tribe-event-url');
                items.forEach((item) => {
                    newUrls.push(item.getAttribute('href'));
                });
                return newUrls;
            });

            // visit each page and extract information 
            for (let i = 0; i < urls.length; i++) {
                await page.goto(urls[i], { waitUntil: 'domcontentloaded' });

                await new Promise(resolve => setTimeout(resolve, 2000));

                let startDate = "", endDate = "", title = "", description = "";
                let location = "", contactPhone = "", contactEmail = ""; photoUrl = "";

                // get title
                let titleEl = await page.$$('#tribe-events .tribe-events-single-event-title');
                if (titleEl && titleEl[0]) {
                    title = await (await titleEl[0].getProperty('innerText')).jsonValue();
                }

                // get description
                let descriptionEl = await page.$$('#tribe-events .tribe-events-single-event-description p');
                if (descriptionEl && descriptionEl[0]) {
                    description = await (await descriptionEl[0].getProperty('innerText')).jsonValue();
                }

                // get event start and end date
                let fullDateEl = await page.$$('#tribe-events .tribe-events-schedule');
                if (fullDateEl && fullDateEl[0]) {
                    let fullDateText = await (await fullDateEl[0].getProperty('innerText')).jsonValue();
                    [startDate, endDate] = helpers.getStartAndEndDates(fullDateText);
                }

                // get location
                let venueEl = await page.$$('#tribe-events .tribe-venue');
                let addressEl = await page.$$('#tribe-events .tribe-address');
                let venue = "", address = "";
                if (venueEl && venueEl[0]) {
                    venue = await (await venueEl[0].getProperty('innerText')).jsonValue();
                }
                if (addressEl && addressEl[0]) {
                    address = await (await addressEl[0].getProperty('innerText')).jsonValue();
                }
                location = venue + "\n" + address;

                // get contact phone
                let contactPhoneEl = await page.$$('#tribe-events .tribe-events-single-section .tribe-venue-tel');
                if (contactPhoneEl && contactPhoneEl[0]) {
                    contactPhone = await (await contactPhoneEl[0].getProperty('innerText')).jsonValue();
                }

                // get contact email
                let contactEmailEl = await page.$$('#tribe-events .tribe-events-single-section .tribe-organizer-email');
                if (contactEmailEl && contactEmailEl[0]) {
                    contactEmail = await (await contactEmailEl[0].getProperty('innerText')).jsonValue();
                }

                // get photoUrl
                photoUrl = await page.evaluate(() => {
                    let photoEl = document.querySelector('#tribe-events .tribe-events-event-image img');
                    if (photoEl) {
                        return photoEl.getAttribute("src");
                    } else {
                        return "";
                    }
                });

                results.push({
                    "platform": "https://www.themotoringdiary.com",
                    "title": title,
                    "location": location,
                    "description": description,
                    "contactPhone": contactPhone,
                    "startDate": startDate,
                    "endDate": endDate,
                    "photoUrl": photoUrl,
                    "eventUrl": urls[i],
                    "contactEmail": contactEmail,
                })
            }

            // go to next page
            currentPage++;
            await page.goto(`https://www.themotoringdiary.com/?tribe_paged=${currentPage}`);
            await new Promise(resolve => setTimeout(resolve, 2000));
            events = (await page.$$("#tribe-events .tribe-events-loop .type-tribe_events"));
        };
    } catch (error) {
        console.log(error);
        if (error.name === "TimeoutError" && ++retry <= MAX_RETRY) {
            browser.close();
            console.log("Timeout error retrying....")
            retryResponse = (await processDataFromThemotoringdiary());
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