/**
 * fetch-prekindle.js
 *
 * - Fetch JSONP from multiple endpoints
 * - Convert JSONP to JSON by removing the "widgetCallback(...)" wrapper
 * - Strip out all columns except:
 *   id, promoId, date, time, title, ages, lineup/0, description, dayOfWeek,
 *   month, monthAbbrev, dayOfMonth, venue, city, state, dtfNames/0,
 *   dtfLinks/0, imageUrl
 * - Generate a CSV with those columns
 */

// ---------------------------------------------------------------------
// 1. CONFIGURATIONS
// ---------------------------------------------------------------------

// If you're on Node 18+, 'fetch' is built-in. Otherwise, install node-fetch:
//    npm install node-fetch
// and then uncomment this import:
// import fetch from 'node-fetch';

// Prekindle JSONP endpoints
const JSONP_URLS = [
    'https://www.prekindle.com/api/events/organizer/22815447474366230&callback=widgetCallback',
    'https://www.prekindle.com/api/events/organizer/22815447474833148&callback=widgetCallback',
    'https://www.prekindle.com/api/events/organizer/531433528752920374&callback=widgetCallback',
    'https://www.prekindle.com/api/events/organizer/532452771022890770&callback=widgetCallback'
];

// The columns you want in the CSV, in order:
const CSV_COLUMNS = [
    'id',
    'promoId',
    'date',
    'time',
    'title',
    'ages',
    'lineup/0',
    'description',
    'dayOfWeek',
    'month',
    'monthAbbrev',
    'dayOfMonth',
    'venue',
    'city',
    'state',
    'dtfNames/0',
    'dtfLinks/0',
    'imageUrl'
];

// ---------------------------------------------------------------------
// 2. HELPER FUNCTIONS
// ---------------------------------------------------------------------

/**
 * Remove the "widgetCallback(...);" wrapper from a JSONP string.
 * Example input:
 *   widgetCallback({"id": 123, "title": "Test"});
 * Returns valid JSON:
 *   {"id":123,"title":"Test"}
 */
function stripJsonpWrapper(jsonpStr) {
    // If the callback name is always `widgetCallback`, we can do:
    return jsonpStr.replace(/^widgetCallback\(/, '').replace(/\);$/, '');
}

/**
 * Convert an array of data objects into a CSV string given a list of columns.
 *
 * @param {Array<Object>} data
 * @param {Array<string>} columns
 * @returns {string} CSV data
 *
 * If a column name contains "/", we treat it as "object.child" or "array index".
 * For example, "lineup/0" means data.lineup[0].
 */
function jsonToCsv(data, columns) {
    // Header row
    const header = columns.join(',');

    // Each row
    const rows = data.map(item => {
        return columns.map(col => {
            // If col is something like "lineup/0", parse it
            const parts = col.split('/');
            let value = item;
            for (const part of parts) {
                if (value === null || value === undefined) break;
                // If the part is a number, treat as array index
                if (/^\d+$/.test(part)) {
                    value = value[Number(part)];
                } else {
                    // otherwise treat as an object key
                    value = value[part];
                }
            }
            // Escape any commas or quotes in the value
            if (typeof value === 'string') {
                // Replace quotes with double quotes, wrap in quotes if needed
                value = value.replace(/"/g, '""');
                // If the value has a comma or quote, wrap in quotes
                if (value.includes(',') || value.includes('"')) {
                    value = `"${value}"`;
                }
            } else if (value === undefined) {
                value = ''; // empty cell if undefined
            }
            return value;
        }).join(',');
    });

    return [header, ...rows].join('\n');
}

// ---------------------------------------------------------------------
// 3. MAIN LOGIC
// ---------------------------------------------------------------------

(async function main() {
    try {
        let allEvents = [];

        for (const url of JSONP_URLS) {
            console.log(`Fetching JSONP from: ${url}`);
            const resp = await fetch(url);
            const text = await resp.text();

            // 1) Strip out widgetCallback(...)
            const jsonString = stripJsonpWrapper(text);

            // 2) Parse into JS object
            let data;
            try {
                data = JSON.parse(jsonString);
            } catch (err) {
                console.error('Error parsing JSON from:', url, err);
                continue; // skip this URL if parse fails
            }

            // The structure might be an array or an object with an `events` key, etc.
            // Adjust accordingly. Let's assume data is an array of event objects:
            const eventsArray = Array.isArray(data) ? data : data.events || [];
            console.log(`Received ${eventsArray.length} events from ${url}`);

            // 3) Add them to a combined array
            allEvents = allEvents.concat(eventsArray);
        }

        // 4) Convert all event objects into CSV
        const csvData = jsonToCsv(allEvents, CSV_COLUMNS);

        // 5) Output or save the CSV
        // For demonstration, we'll just log it. You could also write to a file:
        //
        //   import * as fs from 'node:fs';
        //   fs.writeFileSync('output.csv', csvData, 'utf8');
        //
        console.log('\n=== CSV OUTPUT ===\n');
        console.log(csvData);

        console.log('\nDone! Check output above or write to a file as needed.');
    } catch (err) {
        console.error('Unexpected error:', err);
    }
})();