const puppeteer = require('puppeteer');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;

const csvWriter = createCsvWriter({
    path: `output${new Date().getTime()}.csv`,
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

    let NorcalRes = await getDataFromNorcalcarculture();
    results = results.concat(NorcalRes.result);
    await NorcalRes.browser.close();

    let atodomotoRep = await processDataFromAtodomotor();
    results = results.concat(atodomotoRep.result);
    await atodomotoRep.browser.close();

    let SocalcarcultureResp = await processDataFromSocalcarculture();
    results = results.concat(SocalcarcultureResp.result);
    await SocalcarcultureResp.browser.close();

    let DuponRes = await getDataFromhttpsDupontregistry();
    results = results.concat(DuponRes.result);
    await DuponRes.browser.close();

    let thermotorRes = await processDataFromThemotoringdiary();
    results = results.concat(thermotorRes.result);
    await thermotorRes.browser.close();

    let MiclasicoResp = await processDataFromMiclasico();
    results = results.concat(MiclasicoResp.result);
    await MiclasicoResp.browser.close();

    let aceCafeResp = await processDataFromAcecafe();
    results = results.concat(aceCafeResp.result);
    await aceCafeResp.browser.close();

    let hemmingsResult = await processDataFromHemmings();
    results = results.concat(hemmingsResult.result);
    await hemmingsResult.browser.close();

    let everyCarShowRes = await processDataFromEveryCarShow();
    results = results.concat(everyCarShowRes.result);
    await everyCarShowRes.browser.close();

    let flaCarsShowResp = await processDataFromFlaCarsShows();
    results = results.concat(flaCarsShowResp.result);
    await flaCarsShowResp.browser.close();

    console.log("Total " + results.length + " events pulled.");

    csvWriter
        .writeRecords(results)
        .then(() => console.log('The CSV file was written successfully'));

}

init();
async function getDataFromhttpsDupontregistry() {

    const browser = await puppeteer.launch({
        headless: false,
        networkIdleTimeout: 10000,
        waitUntil: 'networkidle0',
        args: ['--start-maximized', '--window-size=1366,700']
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1366, height: 700 });
    await page.goto('https://directory.dupontregistry.com/explore/?type=event&sort=upcoming');
    console.log("Started to fetch data from directory.dupontregistry.com ");

    var currentPage = 1;
    await page.waitForSelector('.job-manager-pagination ul li');
    var pagesCount = (await page.$$(".job-manager-pagination ul li")).length - 1;

    let results = []
    try {
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

    } catch (e) {
        console.log(e);
        results = []
    }
    console.log(results);
    console.log("pulled ", results.length, " events");
    return {
        'result': results,
        'browser': browser
    }

}

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

    await page.goto('http://everycarshow.com/events/');
    console.log("started fetching data from  http://everycarshow.com/events/");
    return await getDataFromEveryCarShow(page, browser, []);
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
    await page.goto('https://norcalcarculture.com/', {waitUntil: 'load', timeout: 0});
    console.log("Started to fetch data from https://norcalcarculture.com ");
    let results = [];
    try {
        results = await page.evaluate(() => {
            let results = [];
            let events = document.querySelectorAll('.entry-content p');

            for (var i = 0; i < events.length; i++) {

                if (!events[i].querySelector("a > strong")) {
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

                date = date.substring(date.indexOf(",") + 2);
                let startEndDates = date.match(/(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|(Nov|Dec)(?:ember)?) [0-9]{1,2}(th|nd)?/g);
                let startEndTimes = date.match(/[0-9]{1,2}(:?[0-9]{1,2})?(am|pm)/g);
                let currentYear = (new Date).getFullYear();

                // parse start date
                if (startEndDates[0]) {
                    startDate = startEndDates[0] + " " + currentYear;
                    if (startEndTimes && startEndTimes[0]) {
                        startDate = startDate + " " + startEndTimes[0];
                    }
                }

                // parse end date
                if (startEndDates[1]) {
                    endDate = startEndDates[1] + " " + currentYear;
                } else {
                    endDate = startEndDates[0] + " " + currentYear;
                }
                if (startEndTimes && startEndTimes[1]) {
                    endDate = endDate + " " + startEndTimes[1];
                }

                // get location
                location = eventText.substring(eventText.lastIndexOf("at") + 3);

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
    } catch (e) {
        console.log(e);
        results = [];
    }
    console.log(results);
    console.log("pulled " + results.length + " events");
    return {
        'result': results,
        'browser': browser
    }
}

async function getDataFromEveryCarShow(page, browser, results) {
    var currentPage = 1;
    let events = (await page.$$(".tribe-events-list .tribe-events-loop"))[0];

    try {
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
                await page.goto(urls[i], { waitUntil: 'domcontentloaded' });

                await new Promise(resolve => setTimeout(resolve, 2000));

                let startDate = "", endDate = "", title = "", description = "";
                let location = "", contactPhone = "", contactEmail = "";

                // get title
                let titleEl = await page.$$('.tribe-events-single-event-title');
                if (titleEl && titleEl[0]) {
                    title = await (await titleEl[0].getProperty('innerText')).jsonValue();
                }

                // get description
                let descriptionEl = await page.$$('.tribe-events-single-event-description');
                if (descriptionEl && descriptionEl[0]) {
                    description = await (await descriptionEl[0].getProperty('innerText')).jsonValue();
                    description = description.substring(0, description.lastIndexOf("FacebookTwitterGoogle+Email"));
                }

                // get event start and end date
                let fullStartDateEl = "", fullEndDateEl = "";
                fullStartDateEl = await page.$$('.tribe-events-abbr.tribe-events-start-date.published.dtstart');
                if (fullStartDateEl && fullStartDateEl[0]) {
                    let timeEl = await page.$$('.tribe-events-abbr.tribe-events-start-time.published.dtstart');
                    let time = "", startTime = "", endTime = "";
                    if (timeEl && timeEl[0]) {
                        time = await (await timeEl[0].getProperty('innerText')).jsonValue();
                        startTime = time.substring(0, time.indexOf("-") - 1);
                        endTime = time.substring(time.indexOf("-") + 2);
                    }

                    let fullStartDateText = await (await fullStartDateEl[0].getProperty('innerText')).jsonValue();
                    fullStartDateText = fullStartDateText.replace(" \n|Recurring Event (See all)", "");
                    startDate = `${fullStartDateText} ${startTime}`;
                    endDate = `${fullStartDateText} ${endTime}`;
                } else {
                    fullStartDateEl = await page.$$('.tribe-events-abbr.tribe-events-start-datetime.published.dtstart');
                    fullEndDateEl = await page.$$('.tribe-events-abbr.dtend');
                    if (fullStartDateEl && fullStartDateEl[0]) {
                        startDate = await (await fullStartDateEl[0].getProperty('innerText')).jsonValue();
                    }
                    if (fullEndDateEl && fullEndDateEl[0]) {
                        endDate = await (await fullEndDateEl[0].getProperty('innerText')).jsonValue();
                    }
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
    } catch (e) {
        console.log(e);
        results = []
    }
    console.log(results);
    console.log("pulled " + results.length + " events");
    return {
        'result': results,
        'browser': browser
    }
}

async function getDataFromHemmings(page, browser, results) {
    let closeBtn = await page.$x("//button[contains(text(), 'No Thanks')]");
    if (closeBtn) {
        await closeBtn[0].click();
    }

    var eventCount = 0;
    let events = (await page.$$("#results_list .mevent_box"));

    try {
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
                    [startDate, endDate] = getStartAndEndDates(fullDateText);
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
    } catch (e) {
        console.log(e);
        results = []
    }
    console.log(results);
    console.log("pulled " + results.length + " events");
    return {
        'result': results,
        'browser': browser
    }
}

async function getDataFromThemotoringdiary(page, browser, results) {
    var currentPage = 1;
    let events = (await page.$$("#tribe-events .tribe-events-loop .type-tribe_events"));

    try {
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
                    [startDate, endDate] = getStartAndEndDates(fullDateText);
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
        console.log(error)
    }
    console.log(results);
    console.log("pulled " + results.length + " events");
    return {
        'result': results,
        'browser': browser
    }
}

async function getDataFromAtodomotor(page, browser, results) {
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
                let englishMonth = convertMonthFromSpanishToEnglish(spanishMonthMatch[0]);
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
    console.log("results .... ", results);
    console.log("pulled ", results.length, " results");
    return {
        'result': results,
        'browser': browser
    }

}
async function getDataFromOldRide(page) {
    let rows = await page.$$('body > div.main_content > table > tbody > tr > td:nth-child(3) > table > tbody > tr:nth-child(5) > td > table > tbody > tr');
    for (var i = 0; i < rows.length; i++) {
        let tdList = await page.$$(`body > div.main_content > table > tbody > tr > td:nth-child(3) > table > tbody > tr:nth-child(5) > td > table > tbody > tr:nth-child(${i}) > td`)
        for (var j = 0; j < tdList.length; j++) {
            let tdAList = await page.$$(`body > div.main_content > table > tbody > tr > td:nth-child(3) > table > tbody > tr:nth-child(5) > td > table > tbody > tr:nth-child(${i}) > td:nth-child(${j}) > font > a`)
            console.log("tdAList.length ... ", tdAList.length);
            for (var k = 0; k < tdAList.length; i++) {
                let title = await (await tdAList[i].getProperty('innerText')).jsonValue();
                console.log("title ... ", title);
            }
        }
    }

    // let trEl = await page.$$('body > div.main_content > table > tbody > tr > td:nth-child(3) > table > tbody > tr');
    // for( var i = 1 ; i < trEl.length ; i++){
    //     let title="";
    //     for ( var j = 0 ; j < 5;j++){
    //         let titleEL = await page.$$(`body > div.main_content > table > tbody > tr > td:nth-child(3) > table > tbody > tr:nth-child(5) > td > table > tbody > tr:nth-child(${i}) > td:nth-child(${j}) > font > a`);
    //         console.log("titleEl....",titleEL.length)
    //         if(title && titleEL.length > 0){
    //            title = await (await titleEl[0].getProperty('innerText')).jsonValue();
    //         }

    //     }
    //     console.log("title .... ",title);
    // }
}

async function getDataFromSocalCarCulture(page, browser, results) {
    try {
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
                    let month = monthImgEl.getAttribute("src").match(/(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|(Nov|Dec)(?:ember)?)/g)[0];
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
                    let englishMonth = convertMonthFromSpanishToEnglish(spanishMonth);
                    fullDateText = fullDateText.replace(re, englishMonth);
                }

                let monthDatesMatch = fullDateText.match(/\b[0-9]{1,2}(th|nd)?\s(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|(Nov|Dec)(?:ember)?)\b/ig);
                let yearsMatch = fullDateText.match(/\b[0-9]{4}\b/g);
                let timesMatch = fullDateText.match(/\b([0-9]{1,2})(:?[0-9]{1,2})?\s?(a.?m.?|p.?m.?)\b/ig);

                if (!(monthDatesMatch && monthDatesMatch[0])) {
                    monthDatesMatch = fullDateText.match(/\b(Enero|Febrero|Marzo|Abril|Mayo|Junio|Julio|Agosto|Septiembre|Octubre|Noviembre|Diciembre)\s[0-9]{1,2}(th|nd)?\b/ig);
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

            results = await page.evaluate(() => {
                let events = document.querySelectorAll(".postlist .zp_accordion.panel-group");
                let eventResults = [];

                for (let i = 0; i < events.length; i++) {
                    let eventBox = events[i];
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
        }
    } catch (error) {
        console.log(error)
    }
    console.log(results)
    console.log("pulled " + results.length + " results");
    return {
        'result': results,
        'browser': browser
    }
}

async function getDataFromFlaCarsShows(page, browser) {
    let results = [];
    let currentDate = new Date();
    let currentMonth = currentDate.getMonth() + 1;
    let currentMonthText = ('0' + currentMonth).slice(-2);
    let currentYear = currentDate.getFullYear();

    try {
        let pageURL = `https://flacarshows.com/events/event/on/${currentYear}`;
        await page.goto(pageURL, {waitUntil: 'load', timeout: 0});
        await page.waitForSelector('#left-area .event');
        let eventsInCurrentYear = await page.$$("#left-area .event");

        // loop through year while we have events in current year
        while (eventsInCurrentYear.length) {
            // loop through months
            while (currentMonth <= 12) {
                pageURL = `https://flacarshows.com/events/event/on/${currentYear}/${currentMonthText}`;
                await page.goto(pageURL, {waitUntil: 'load', timeout: 0});

                let currentDates = await page.evaluate(() => {
                    let datesEl = [].slice.call(document.querySelectorAll('#wp-calendar tbody tr > td.event'));
                    return datesEl.map(dateEl => {
                        let date = dateEl.innerText;
                        date = ('0' + date).slice(-2);
                        return date;
                    })
                });

                // loop through dates
                for (let i = 0; i < currentDates.length; i++) {
                    pageURL = `https://flacarshows.com/events/event/on/${currentYear}/${currentMonthText}/${currentDates[i]}`;
                    await page.goto(pageURL, {waitUntil: 'load', timeout: 0});

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
                        await page.goto(eventUrls[j], {waitUntil: 'load', timeout: 0});

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
                            let venue = "";
                            if (venueEl && venueEl[0]) {
                                venue = await (await venueEl[0].getProperty('innerText')).jsonValue();
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
                            "platform": "https://www.miclasico.com/calendario",
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
            }
            currentYear++;
            currentMonth = 1;   // reset month
            currentMonthText = ('0' + currentMonth).slice(-2);
            pageURL = `https://flacarshows.com/events/event/on/${currentYear}`;
            await page.goto(pageURL, {waitUntil: 'load', timeout: 0});
            eventsInCurrentYear = await page.$$("#left-area .event");
        }
    } catch (error) {
        console.log(error);
        results = [];
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

    await page.goto('https://www.hemmings.com/calendar');
    console.log("started fetching data from https://www.hemmings.com/calendar");
    return await getDataFromHemmings(page, browser, []);
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

    await page.goto('https://www.themotoringdiary.com/');
    console.log("pulling data for https://www.themotoringdiary.com/");
    return await getDataFromThemotoringdiary(page, browser, []);
}
async function processDataFromAtodomotor() {
    const browser = await puppeteer.launch({
        headless: false,
        networkIdleTimeout: 10000,
        waitUntil: 'networkidle0',
        args: ['--start-maximized', '--window-size=1366,700']
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1366, height: 700 });
    await page.goto('https://www.atodomotor.com/agenda/2019');

    return await getDataFromAtodomotor(page, browser, []);
}

async function processDateForOldride() {
    let URLS = ['https://www.oldride.com/events/alaska.html'];
    for (var i = 0; i < URLS.length; i++) {
        const browser = await puppeteer.launch({
            headless: false,
            networkIdleTimeout: 10000,
            waitUntil: 'networkidle0',
            args: ['--start-maximized', '--window-size=1366,700']
        });
        const page = await browser.newPage();
        await page.setViewport({ width: 1366, height: 700 });
        await page.goto(URLS[i]);

        getDataFromOldRide(page);
    }

}

async function processDataFromSocalcarculture() {
    //let Url = ['https://www.oldride.com/events/alaska.html'];
    // for (var i = 0; i < URLS.length; i++) {
    const browser = await puppeteer.launch({
        headless: false,
        networkIdleTimeout: 10000,
        waitUntil: 'networkidle0',
        args: ['--start-maximized', '--window-size=1366,700']
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1366, height: 700 });
    await page.goto('http://www.socalcarculture.com/events.html');

    return await getDataFromSocalCarCulture(page, browser, []);
    // }
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

    await page.goto('https://www.miclasico.com/calendario');

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

    await page.setRequestInterception(true);
    
    page.on('request', (req) => {
        if(req.resourceType() == 'stylesheet' || req.resourceType() == 'font' || req.resourceType() == 'image'){
            req.abort();
        }
        else {
            req.continue();
        }
    });

    return await getDataFromAceCafe(page, browser);
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

function getStartAndEndDates(fullDateText) {
    let monthDatesMatch = fullDateText.match(/\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|(Nov|Dec)(?:ember)?) [0-9]{1,2}(th|nd)?\b/ig);
    let yearsMatch = fullDateText.match(/\b[0-9]{4}\b/g);
    let timesMatch = fullDateText.match(/\b([0-9]{1,2})(:?[0-9]{1,2})?\s?(a.?m.?|p.?m.?)\b/ig);
    let startDate = "", endDate = "";

    if (!(monthDatesMatch && monthDatesMatch[0])) {
        monthDatesMatch = fullDateText.match(/\b[0-9]{1,2}(th|nd)?\s(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|(Nov|Dec)(?:ember)?)\b/ig);
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

    return [startDate, endDate];
}

function convertMonthFromSpanishToEnglish(spanishMonth) {
    switch (spanishMonth) {
        case "Enero":
            return "January";
        case "Febrero":
            return "February";
        case "Marzo":
            return "March";
        case "Abril":
            return "April";
        case "Mayo":
            return "May";
        case "Junio":
            return "June";
        case "Julio":
            return "July";
        case "Agosto":
            return "August";
        case "Septiembre":
            return "September";
        case "Octubre":
            return "October";
        case "Noviembre":
            return "November";
        case "Diciembre":
            return "December";

        default:
            return "";
    }
}