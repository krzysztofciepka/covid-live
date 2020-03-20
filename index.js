const blessed = require('blessed');
const axios = require('axios');
const cheerio = require('cheerio');
const moment = require('moment');

module.exports = {
    run: () => {
        const refresh_ms = 60000;

        const state = {
            current: {
                cases: 0,
                recovered: 0,
                deaths: 0
            },
            changes: []
        }


        const screen = blessed.screen({
            smartCSR: true
        });

        screen.title = 'COVID Live';

        const getData = async () => {
            try {
                const response = await axios.get('https://www.worldometers.info/coronavirus/');
                const $ = cheerio.load(response.data);

                const items = [];
                $('.maincounter-number').each((_, item) => {
                    items.push(parseInt(item.children[1].children[0].data.trim().replace(/,/g, ''), 10));
                })

                const [cases, deaths, recovered] = items;

                return {
                    cases,
                    recovered,
                    deaths
                }
            }
            catch (e) {
                // ignore errors from API, just return old data
                return state.current
            }

        }

        const updateState = (update) => {
            const infectedUpdate = update.cases - state.current.cases;
            const recoveredUpdate = update.recovered - state.current.recovered;
            const deathsUpdate = update.deaths - state.current.deaths;

            if (infectedUpdate) {
                state.changes.push(`${moment().format('MMMM Do YYYY, h:mm:ss a')}    ${infectedUpdate > 0 ? '+' : ''}${infectedUpdate} infected`);
            }

            if (recoveredUpdate) {
                state.changes.push(`${moment().format('MMMM Do YYYY, h:mm:ss a')}    ${recoveredUpdate > 0 ? '+' : ''}${recoveredUpdate} recovered`);
            }

            if (deathsUpdate) {
                state.changes.push(`${moment().format('MMMM Do YYYY, h:mm:ss a')}    ${deathsUpdate > 0 ? '+' : ''}${deathsUpdate} deaths`);
            }

            state.current = update;
        }

        const stats = blessed.box({
            top: 'left',
            left: 'left',
            width: '100%',
            height: '20%',
            tags: true,
            border: {
                type: 'line'
            },
            style: {
            }
        });

        const updates = blessed.list({
            top: '20%',
            left: 'left',
            width: '100%',
            height: '80%',
            label: '{bold} Recent events {/bold}',
            tags: true,
            alwaysScroll: true,
            scrollable: true,
            keys: true,
            mouse: true,
            border: {
                type: 'line'
            },
            style: {
            }
        });

        const handler = async () => {
            const data = await getData();
            updateState(data);
            stats.setContent(`{center}{bold}Infected:{/bold} ${state.current.cases}   {bold}Deaths:{/bold} ${state.current.deaths}  {bold}Recovered:{/bold} ${state.current.recovered}{/center}`);
            updates.setItems(state.changes);
            screen.render();
        }

        screen.append(stats);
        screen.append(updates);

        // Quit on Escape, q, or Control-C.
        screen.key(['escape', 'q', 'C-c'], function (ch, key) {
            return process.exit(0);
        });

        getData().then(data => {
            state.current = data;
            stats.setContent(`{center}{bold}Infected:{/bold} ${state.current.cases}   {bold}Deaths:{/bold} ${state.current.deaths}  {bold}Recovered:{/bold} ${state.current.recovered}{/center}`);
            screen.render();
        });

        setInterval(handler, refresh_ms);

        screen.render();
    }
}