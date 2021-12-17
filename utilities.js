import { createInterface } from 'readline';

export function askQuestion(query) {
    const rl = createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    return new Promise(resolve => rl.question(query, ans => {
        rl.close();
        resolve(ans);
    }))
}

export function formatPeriod(period) {
    if (period < 60) {
        return `${period} minutes`;
    }

    if (period < 1440) {
        return `${Math.floor(period / 60)} hours`;
    }

    return `${Math.floor(period / 60 / 24)} days`;
}

export function formatIN(amount) {
    return `${amount.toFixed(4)} IN`;
}

export function parseTimeString(str) {
    const regex = /^(?:([0-9\.]+)y)?(?:([0-9\.]+)w)?(?:([0-9\.]+)d)?(?:([0-9\.]+)h)?(?:([0-9\.]+)m)?(?:([0-9\.]+)s)?(?: (.+))?$/;

    const results = regex.exec(str);

    if (!results) {
        console.log('Failed to parse time str.');
        process.exit(1);
        return;
    }

    const [
        ,
        years=0,
        weeks=0,
        days=0,
        hours=0,
        minutes=0,
        seconds=0,
        description
    ] = results;

    const totalTimeSeconds = Number(seconds)
                           + Number(minutes) * 60
                           + Number(hours) * 60 * 60
                           + Number(days) * 60 * 60 * 24
                           + Number(weeks) * 60 * 60 * 24 * 7
                           + Number(years) * 60 * 60 * 24 * 365;

    return totalTimeSeconds;
}

export function parseNumber(str) {
    const num = Number(str);

    if (Number.isNaN(str)) {
        console.log(`Failed to parse number "${str}".`);
        process.exit(1);
    }

    return num;
}

