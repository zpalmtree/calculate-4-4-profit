import {
    askQuestion,
    parseTimeString,
    parseNumber,
} from './utilities.js';

export async function getHaveExistingBond() {
    const bonding = await askQuestion('Do you have an existing bond? [y/N]: ');

    const letter = bonding.length === 0
        ? 'n'
        : bonding.toLowerCase()[0];

    return letter === 'y';
}

export async function getRebondRate(solanaBlockTime) {
    const rate = await askQuestion('How often do you claim and restake your bond rewards?: (e.g. 8h): ');

    const timeParsed = parseTimeString(rate);

    return Math.floor((timeParsed * 1000) / solanaBlockTime);
}

export async function getBondRate() {
    let rate = await askQuestion('What is the best current bond discount?: ');

    if (rate.endsWith('%')) {
        rate = rate.substr(0, rate.length - 1);
    }

    const rateNum = parseNumber(rate);

    return rateNum;
}
