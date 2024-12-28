/**
 * fetch-prekindle.js
 *
 * 1. Fetch JSONP from multiple Prekindle endpoints.
 * 2. Strip out the "callback(...)" wrapper or similar patterns robustly.
 * 3. Parse the JSON.
 * 4. Combine and convert data to CSV.
 * 5. Write output to "output.csv".
 */

import * as fs from 'node:fs';
// If on Node < 18, you'll need to install node-fetch:
//   npm install node-fetch
// and then uncomment this import:
// import fetch from 'node-fetch';

// -- 1) CONFIG ------------------------------------------------------

const JSONP_URLS = [
    'https://www.prekindle.com/api/events/organizer/22815447474366230&callback=callback',
    'https://www.prekindle.com/api/events/organizer/22815447474833148&callback=callback',
    'https://www.prekindle.com/api/events/organizer/531433528752920374&callback=callback',
    'https://www.prekindle.com/api/events/organizer/532452771022890770&callback=callback',
];

const CSV_COLUMNS = [
    'id',
    'promoId',
    'date',
    'time',
    'title',
    'ages',
    'lineup/0',
    'dayOfWeek',
    'month',
    'monthAbbrev',
    'dayOfMonth',
    'venue',
    'city',
    'state',
    'dtfNames/0',
    'dtfLinks/0',
    'imageUrl',
];

// -- 2) JSONP STRIPPER ----------------------------------------------

function stripJsonpWrapper(str) {
    const match = str.match(/^[^\{]*([\w$]+)\((\{[\s\S]*\})\)\s*;?$/);

    if (!match) {
        console.error("Raw text that failed to match:", str.slice(0, 200)); // Log up to 200 chars of the raw text
        throw new Error(
            "Could not match the JSONP callback pattern. Check the callback name or extra text."
        );
    }

    const callbackName = match[1];
    const jsonContent = match[2];

    console.log(`Detected callback name: ${callbackName}`);
    return jsonContent; // Return only the JSON portion
}

// -- 3) CSV GENERATOR -----------------------------------------------

function jsonToCsv(data, columns) {
    const header = columns.join(',');

    const rows = data.map(item => {
        return columns.map(col => {
            const parts = col.split('/');
            let value = item;
            for (const part of parts) {
                if (value == null) break;
                value = /^\d+$/.test(part) ? value[Number(part)] : value[part];
            }
            return value == null ? '' : typeof value === 'string' ?
                `"${value.replace(/"/g, '""')}"` :
                value;
        }).join(',');
    });

    return [header, ...rows].join('\n');
}

// -- 4) MAIN LOGIC --------------------------------------------------

(async function main() {
    try {
        let allEvents = [];

        for (const url of JSONP_URLS) {
            console.log(`\nFetching JSONP from: ${url}`);

            const response = await fetch(url);
            const rawText = await response.text();

            console.log("Raw response start:", rawText.slice(0, 80));

            let stripped;
            try {
                stripped = stripJsonpWrapper(rawText);
            } catch (stripErr) {
                console.error("Error stripping JSONP wrapper:", stripErr);
                continue;
            }

            console.log("Stripped response end:", stripped.slice(-80));

            let data;
            try {
                data = JSON.parse(stripped);
            } catch (parseErr) {
                console.error("Error parsing JSON from:", url, parseErr);
                continue;
            }

            const eventsArray = Array.isArray(data) ? data : data.events || [];
            console.log(`Parsed ${eventsArray.length} events from ${url}`);

            allEvents = allEvents.concat(eventsArray);
        }

        const csvData = jsonToCsv(allEvents, CSV_COLUMNS);

        fs.writeFileSync('output.csv', csvData, 'utf8');
        console.log('\nAll done! CSV saved to output.csv');

    } catch (err) {
        console.error("Unexpected error in main:", err);
    }
})();