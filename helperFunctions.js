function getStartAndEndDates(fullDateText) {
    let startDate = "", endDate = "";
    try {
        let monthDatesMatch = fullDateText.match(/\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|(Nov|Dec)(?:ember)?) [0-9]{1,2}(th|nd|rd|st)?\b/ig);
        let yearsMatch = fullDateText.match(/\b[0-9]{4}\b/g);
        let timesMatch = fullDateText.match(/\b([0-9]{1,2})(:?[0-9]{1,2})?\s?(a.?m.?|p.?m.?)\b/ig);

        if (!(monthDatesMatch && monthDatesMatch[0])) {
            monthDatesMatch = fullDateText.match(/\b[0-9]{1,2}(th|nd|rd|st)?\s(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|(Nov|Dec)(?:ember)?)\b/ig);
        }

        if (monthDatesMatch && monthDatesMatch[0]) {
            startDate = monthDatesMatch[0];
            if (yearsMatch && yearsMatch[0]) {
                startDate += " " + yearsMatch[0];
            }

            if (monthDatesMatch[1]) {
                endDate = monthDatesMatch[1];
            } else if (monthDatesMatch && monthDatesMatch[0]) {
                if (fullDateText.includes("to") || fullDateText.includes("-")) {
                    endDate = monthDatesMatch[0];
                }
            }

            if (fullDateText.includes("to") || fullDateText.includes("-")) {
                if (yearsMatch && yearsMatch[1]) {
                    endDate += " " + yearsMatch[1];
                } else if (yearsMatch && yearsMatch[0]) {
                    endDate += " " + yearsMatch[0];
                }
            }

            if (timesMatch && timesMatch[0] && timesMatch[1]) {
                startDate += " " + timesMatch[0];
                endDate += " " + timesMatch[1];
            }
        }
    } catch (error) {
        console.log(error);
        return ["", ""];
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

module.exports = { getStartAndEndDates, convertMonthFromSpanishToEnglish };