const puppeteer = require('puppeteer');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;

const csvWriter = createCsvWriter({
    path: `output${new Date().getTime()}.csv`,
    header: [
        { id: 'platform', title: 'platform' },
        { id: 'date', title: 'date' },
        { id: 'title', title: 'title' },
        { id: 'location', title: 'location' },
        { id: 'contact', title: 'contact' },
    ]
});

async function init() {
    let results = []
    let DuponRes = await getDataFromhttpsDupontregistry();
    results = results.concat(DuponRes.result);
    await DuponRes.browser.close();

    let NorcalRes = await getDataFromNorcalcarculture();
    results = results.concat(NorcalRes.result);
    await NorcalRes.browser.close();

    // let everyCarShowRes = await processDataFromEveryCarShow();
    // console.log("everyCarShowRes.result ... ", everyCarShowRes.result);
    // results = results.concat(everyCarShowRes.result);
    // await everyCarShowRes.browser.close();

    // let hemmingsResult = await processDataFromHemmings();
    // results = results.concat(hemmingsResult.result);
    // await hemmingsResult.browser.close();

    // let thermotorRes = await processDataFromThemotoringdiary();
    // results = results.concat(thermotorRes.result);
    // await thermotorRes.browser.close();

    // ------------------------------------------------------------
    
    // let atodomotoRep = await processDataFromAtodomotor();
    // results = results.concat(atodomotoRep.result);
    // await atodomotoRep.browser.close();

    // let SocalcarcultureResp = await processDataFromSocalcarculture();
    // results = results.concat(SocalcarcultureResp.result);
    // await SocalcarcultureResp.browser.close();

    let MiclasicoResp = await processDataFromMiclasico();
    results = results.concat(MiclasicoResp.result);
    await MiclasicoResp.browser.close();


    let aceCafeResp = await  processDataFromAcecafe();
    results = results.concat(aceCafeResp.result);
    await aceCafeResp.browser.close();


    csvWriter
        .writeRecords(results)
        .then(() => console.log('The CSV file was written successfully'));


    //processDataFromAtodomotor()
    //processDateForOldride() // NI
    //processDataFromSocalcarculture();
    //processDataFromMiclasico();
    

}

init();
async function getDataFromhttpsDupontregistry() {

    const browser = await puppeteer.launch({
        headless: false,
        networkIdleTimeout: 10000,
        waitUntil: 'networkidle',
        args: ['--start-maximized', '--window-size=1366,700']
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1366, height: 700 });
    await page.goto('https://directory.dupontregistry.com/explore/?type=event&sort=upcoming');
    console.log("Started to fetch data from directory.dupontregistry.com ");
    var gridItem = await page.$$('.grid-item');
    let results = []
    try {
        for (var i = 0; i < gridItem.length; i++) {
            let month = "", date = "", title = "", location = "", contact = "", venue = "";

            let monthEl = await page.$$('.grid-item .lf-item-container .lf-item a .lf-head .lf-head-btn .event-date .e-month');
            let dateEl = await page.$$('.grid-item .lf-item-container .lf-item a .lf-head .lf-head-btn .event-date .e-day');
            let titleEl = await page.$$('.grid-item .lf-item-container .lf-item a .lf-item-info-2 h4');
            let locationEl = await page.$$('.grid-item .lf-item-container .lf-item a .lf-item-info-2 h4');
            let misc = await page.$$('.grid-item .lf-item-container .lf-item a .lf-item-info-2 ul li');

            if (monthEl && monthEl[i]) {
                month = await (await monthEl[i].getProperty('innerText')).jsonValue();
            }
            if (dateEl && dateEl[i]) {
                date = await (await dateEl[i].getProperty('innerText')).jsonValue();
            }
            if (titleEl && titleEl[i]) {
                title = await (await titleEl[i].getProperty('innerText')).jsonValue();
            }
            if (locationEl && locationEl[i]) {
                location = await (await locationEl[i].getProperty('innerText')).jsonValue();
            }
            if (misc && misc[2 * i]) {
                contact = await (await misc[2 * i].getProperty('innerText')).jsonValue();
            }
            if (misc && misc[(2 * i) + 1]) {
                venue = await (await misc[(2 * i) + 1].getProperty('innerText')).jsonValue();
            }
            results.push({
                "platform": "https://directory.dupontregistry.com/explore/?type=event&sort=upcoming",
                "date": date + " " + month,
                "title": title + " " + location,
                "contact": contact,
                "location": venue
            })
        }
    } catch (e) {
        console.log("ERROR OCCURED");
        results = []
    }
    return {
        'result': results,
        'browser': browser
    }

}

async function processDataFromEveryCarShow() {
    const browser = await puppeteer.launch({
        headless: false,
        networkIdleTimeout: 10000,
        waitUntil: 'networkidle',
        args: ['--start-maximized', '--window-size=1366,700']
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1366, height: 700 });
    await page.goto('http://everycarshow.com/events/');
    console.log("started fetching data from  http://everycarshow.com/events/");
    return await getDataFromEveryCarShow(page, browser, []);
}
async function getDataFromNorcalcarculture() {
    const browser = await puppeteer.launch({
        headless: false,
        networkIdleTimeout: 10000,
        waitUntil: 'networkidle',
        args: ['--start-maximized', '--window-size=1366,700']
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1366, height: 700 });
    await page.goto('https://norcalcarculture.com/');
    console.log("Started to fetch data from https://norcalcarculture.com ");
    let eventParas = await page.$$('.entry-content p');
    let results = [];
    try {
        for (var i = 2; i < eventParas.length; i++) {
            let title = "", date = "", location = "";
            let data = await (await eventParas[i].getProperty('innerText')).jsonValue();
            title = data.substring(data.indexOf(':') + 1, data.lastIndexOf('is'));
            date = data.substring(data.indexOf(', ') + 1, data.lastIndexOf('at'));
            location = data.substring(data.indexOf(' at ') + 4, data.lastIndexOf('.'));


            results.push({
                "platform": "https://norcalcarculture.com/",
                "date": date,
                "title": title,
                "contact": "",
                "location": location
            })
        }
    } catch (e) {
        console.log("ERROR OCCURED");
        results = [];
    }
    console.log("pulled ", results.length, " events");
    return {
        'result': results,
        'browser': browser
    }
}

async function getDataFromEveryCarShow(page, browser, results) {


    let eventBox = await page.$$('.type-tribe_events');
    for (var i = 0; i < eventBox.length; i++) {
        let titleEl = await page.$$('.tribe-events-list-event-title');
        let title = "";
        let eventDt = "";
        let addressName = "";
        let address;
        try {
            if (titleEl && titleEl[i]) {
                title = await (await titleEl[i].getProperty('innerText')).jsonValue();
            }
            let eventDtEl = await page.$$('.tribe-event-date-start');
            if (eventDtEl && eventDtEl[i]) {
                eventDt = await (await eventDtEl[i].getProperty('innerText')).jsonValue();
            }
            let addressNameEl = await page.$$('.tribe-events-venue-details a');
            if (addressNameEl && addressNameEl[(2 * i + 1)]) {
                addressName = await (await addressNameEl[(2 * i + 1)].getProperty('innerText')).jsonValue();
            }
            let addressEl = await page.$$('.tribe-address');
            if (addressEl && addressEl[i]) {
                address = await (await addressEl[i].getProperty('innerText')).jsonValue();
            }
            results.push({
                "platform": "http://everycarshow.com/events/",
                "date": eventDt,
                "title": title,
                "contact": "",
                "location": addressName + "," + address
            })
        } catch (e) {
            console.log("ERROR OCCURED");
            results = [];
        }
    }

    let nextBtn = await page.$('.tribe-events-nav-next a');
    //console.log("nxtBtn ... ",nextBtn);
    if (nextBtn) {
        nextBtn.click();
        page.waitForNavigation({ waitUntil: 'networkidle0' })
        await getDataFromEveryCarShow(page, browser, results);
    }
    console.log("pulled ", results.length, " events");
    return {
        'result': results,
        'browser': browser,
    };
}

async function getDataFromHemmings(page, browser, results) {
    let closeBtn = await page.$x("//button[contains(text(), 'No Thanks')]");
    if (closeBtn) {
        closeBtn[0].click();
    }
    let eventBox = await page.$$('.mevent_box');
    for (var i = 0; i < eventBox.length; i++) {
        try{
        let month, day, title, location;
        let monthEl = await page.$$('.mevent_box .calendar-column .hidden-phone .month');
        let dayEl = await page.$$('.mevent_box .calendar-column div .day');
        let titleEl = await page.$$('.mevent_box .event_detail h2');
        let locationEl = await page.$$('.mevent_box .event_detail h3');

        if (monthEl && monthEl[i]) {
            //month = await (await monthEl[i].getProperty('innerText')).jsonValue();
            let element = monthEl[i];
            month = await page.evaluate(element => element.textContent, element);

        }
        if (dayEl && dayEl[i]) {
            day = await (await dayEl[i].getProperty('innerText')).jsonValue();
        }
        if (titleEl && titleEl[i]) {
            title = await (await titleEl[i].getProperty('innerText')).jsonValue();
        }
        if (locationEl && titleEl[i]) {
            location = await (await locationEl[i].getProperty('innerText')).jsonValue();
        }
        results.push({
            "platform": "http://everycarshow.com/events/",
            "date": day + "," + month,
            "title": title,
            "contact": "",
            "location": location
        })
    }catch(e){
        console.log("ERROR OCCURED");
        results = [];
    }
    }
    let nextBtn = await page.$x('//*[@id="search_paginate"]/ul/li[7]/a/img');
    if (nextBtn) {
        // await Promise.all([nextBtn[0].click(), page.waitForNavigation({ waitUntil: 'networkidle0' })]);
        //await getDataFromHemmings(page,browser,results);
    }
    console.log("pulled ", results.length, " items");
    return {
        'result': results,
        'browser': browser
    }
}

async function getDataFromThemotoringdiary(page, browser, results) {
    //page.waitForNavigation();
    let eventBox = await page.$$('.type-tribe_events');
    console.log("eventBox.... ", eventBox.length);
    for (var i = 0; i < eventBox.length; i++) {
        let title = "", date = "";

        let titleEl = await page.$$('.tribe-events-list-event-title a');
        let details = await page.$$('.tribe-event-schedule-details');
        if (titleEl && titleEl[i]) {
            title = await (await titleEl[i].getProperty('innerText')).jsonValue();
        }
        if (details && details[i]) {
            date = await (await details[i].getProperty('innerText')).jsonValue();
        }
        results.push({
            "platform": "https://www.themotoringdiary.com/",
            "date": date,
            "title": title,
            "contact": "",
            "location": ""
        })
    }
    let nextBtn = await page.$('#tribe-events-footer nav .tribe-events-sub-nav .tribe-events-nav-next')
    if (nextBtn) {
        nextBtn.click();
        //await page.waitForSelector('.tribe-events-loop');
        await getDataFromThemotoringdiary(page, browser, results);
    }
    console.log("pulled ", results.length, " events");
    return {
        'result': results,
        'browser': browser
    }
}

async function getDataFromAtodomotor(page, browser, results) {
    //page.waitForNavigation();
    let eventBox = await page.$$('.listBox');
    for (var i = 0; i < eventBox.length; i++) {
        let date, title, category;
        let dateEl = await page.$$('.listBoxContent .listBoxSubtitle');
        let titleEl = await page.$$('.listBoxContent div[itemprop="name"]');
        let categoryEl = await page.$$('.listBoxContent .listBoxCategory');
        if (dateEl && dateEl[i]) {
            date = await (await dateEl[i].getProperty('innerText')).jsonValue();
        }
        if (titleEl && titleEl[i]) {
            title = await (await titleEl[i].getProperty('innerText')).jsonValue();
        }
        if (categoryEl && categoryEl[i]) {
            category = await (await categoryEl[i].getProperty('innerText')).jsonValue();
        }
        results.push({
            "platform": "https://www.atodomotor.com/agenda/2019",
            "date": date,
            "title": title,
            "contact": "",
            "location": category
        })
    }
    console.log("results .... ", results);
    return {
        'result': results,
        'browser': browser
    }

}
async function getDataFromOldRide(page) {
    //page.waitForNavigation();

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

async function getDataFromSocalCarCulture(page) {
    page.waitForNavigation();
    let trEl = await page.$$('#Layer3 table tbody tr');
    for (var i = 0; i < trEl.length; i++) {
        page.$$('#Layer3 table tbody tr');
    }


}

async function getDataFromMiclasico(page,browser) {
    let eventBox = await page.$$('.ev_td_li');
    let title = "", date = "", venue = "";
    let results = [];
    for (var i = 0; i < eventBox.length; i++) {
        let titleEl = await page.$$('.ev_td_li .uk-flex');
        let dateEl = await page.$$('.ev_td_li div div table tr');
        let venueEL = await page.$$('.ev_td_li div table tbody tr');
        //console.log("titleEL .... ",titleEl);
        if (titleEl && titleEl[i]) {
            //console.log("titleEL ... ",titleEl[i]);
            title = await (await titleEl[i].getProperty('innerText')).jsonValue();
        }
        if (dateEl && dateEl[i]) {
            //console.log("titleEL ... ",titleEl[i]);
            date = await (await dateEl[i].getProperty('innerText')).jsonValue();
        }
        if (venueEL && venueEL[i]) {
            venue = await (await venueEL[i].getProperty('innerText')).jsonValue();
        }
        results.push({
            "platform": "https://www.atodomotor.com/agenda/2019",
            "date": date,
            "title": title,
            "contact": "",
            "location": venue
        });        
    }
    return {
        'result' : results,
        'browser' : browser
    }
}

async function getDataFromAceCafe(page, browser) {
    var eventBox = page.$$('.zp_accordion.panel-group');
    for (var i = 0; i < eventBox.length; i++) {
        var date = "", title = "";
        let dtEl = await page.$$('.zp_accordion.panel-group .zp_accordion_element .heading.panel-heading .panel-title button span .date-container-outer');
        if (dtEl && dtEl[i]) {
            date = await (await dtEl[i].getProperty('innerText')).jsonValue();
        }
    }
    //await browser.close();

}

async function processDataFromHemmings() {
    const browser = await puppeteer.launch({
        headless: false,
        networkIdleTimeout: 10000,
        waitUntil: 'networkidle',
        args: ['--start-maximized', '--window-size=1366,700']
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1366, height: 700 });
    await page.goto('https://www.hemmings.com/calendar');
    console.log("startef fetching data from https://www.hemmings.com/calendar");
    return await getDataFromHemmings(page, browser, []);
}

async function processDataFromThemotoringdiary() {
    const browser = await puppeteer.launch({
        headless: false,
        networkIdleTimeout: 10000,
        waitUntil: 'networkidle',
        args: ['--start-maximized', '--window-size=1366,700']
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1366, height: 700 });
    await page.goto('https://www.themotoringdiary.com/');
    console.log("pulling data for https://www.themotoringdiary.com/");
    return await getDataFromThemotoringdiary(page, browser, []);
}
async function processDataFromAtodomotor() {
    const browser = await puppeteer.launch({
        headless: false,
        networkIdleTimeout: 10000,
        waitUntil: 'networkidle',
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
            waitUntil: 'networkidle',
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
    for (var i = 0; i < URLS.length; i++) {
        const browser = await puppeteer.launch({
            headless: false,
            networkIdleTimeout: 10000,
            waitUntil: 'networkidle',
            args: ['--start-maximized', '--window-size=1366,700']
        });
        const page = await browser.newPage();
        await page.setViewport({ width: 1366, height: 700 });
        await page.goto('http://www.socalcarculture.com/events.html');

        return await getDataFromSocalCarCulture(page);
    }
}


async function processDataFromMiclasico() {

    const browser = await puppeteer.launch({
        headless: false,
        networkIdleTimeout: 10000,
        waitUntil: 'networkidle',
        args: ['--start-maximized', '--window-size=1366,700']
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1366, height: 700 });
    await page.goto('https://www.miclasico.com/calendario');

    return await getDataFromMiclasico(page,browser);

}

async function processDataFromAcecafe() {
    let results = [];
    const URLS = ['https://london.acecafe.com/meets/?cm=1&cy=2019&ct=cars', 'https://london.acecafe.com/meets/?cm=2&cy=2019&ct=cars',
        'https://london.acecafe.com/meets/?cm=3&cy=2019&ct=cars', 'https://london.acecafe.com/meets/?cm=4&cy=2019&ct=cars',
        'https://london.acecafe.com/meets/?cm=5&cy=2019&ct=cars', 'https://london.acecafe.com/meets/?cm=6&cy=2019&ct=cars',
        'https://london.acecafe.com/meets/?cm=7&cy=2019&ct=cars', 'https://london.acecafe.com/meets/?cm=8&cy=2019&ct=cars',
        'https://london.acecafe.com/meets/?cm=9&cy=2019&ct=cars', 'https://london.acecafe.com/meets/?cm=10&cy=2019&ct=cars',
        'https://london.acecafe.com/meets/?cm=11&cy=2019&ct=cars', 'https://london.acecafe.com/meets/?cm=12&cy=2019&ct=cars'

    ]
    for (var i = 0; i < URLS.length; i++) {
        const browser = await puppeteer.launch({
            headless: false,
            networkIdleTimeout: 10000,
            waitUntil: 'networkidle',
            args: ['--start-maximized', '--window-size=1366,700']
        });
        const page = await browser.newPage();
        await page.setViewport({ width: 1366, height: 700 });
        await page.goto(URLS[i]);

        await getDataFromAceCafe(page, browser);
    }
}