const readline = require('readline');

/* 400 ms */
const rebasePeriod = 400;

/* 216,000 */
const rebasesPerDay = (1000 * 60 * 60 * 24) / rebasePeriod;

const restakePeriod = 60;

async function main() {
    await gimmeTheBestBondDiscounts();
}

function parseTimeString(str) {
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

function parseNumber(str) {
    const num = Number(str);

    if (Number.isNaN(str)) {
        console.log(`Failed to parse number "${str}".`);
        process.exit(1);
    }

    return num;
}

async function gimmeTheBestBondDiscounts() {
    let apy = await askQuestion('What is the current APY?: ');

    if (apy.endsWith('%')) {
        apy = apy.substr(0, apy.length - 1);
    }

    const apyNum = parseNumber(apy);

    const bonding = await askQuestion('Do you have an existing bond? [y/N]: ');

    const letter = bonding.length === 0
        ? 'n'
        : bonding.toLowerCase()[0];

    if (letter === 'n') {
        const discount = calculateMinimumBondDiscount(apyNum, restakePeriod);

        console.log(`With a restake period of ${formatPeriod(restakePeriod)}, ` +
            `(4,4) is more profitable than (3,3) when bonds are >= ${discount.toFixed(2)}%`
        );
    } else {
        const staked = await askQuestion('How much IN are you currently staking?: ');

        const stakedNum = parseNumber(staked);

        const bonded = await askQuestion('How much IN is pending in bonds?: ');

        const bondedNum = parseNumber(bonded);

        const time = await askQuestion('How many days/hours does your bond have remaining? (e.g. 2d10h): ');

        const timeParsed = parseTimeString(time);

        const percentBonded = (bondedNum / (stakedNum + bondedNum)) * 100;

        const bondPeriod = (timeParsed * 1000) / rebasePeriod;

        const discount = calculateMinimumBondDiscountWithPartialVest(apyNum, restakePeriod, percentBonded, bondPeriod);

        console.log(`With a restake period of ${formatPeriod(restakePeriod)}, and ` +
            `${percentBonded.toFixed(1)}% of your IN locked up in bonds with ` +
            `${formatPeriod(timeParsed / 60)} remaining, (4,4) is more profitable ` +
            `than (3,3) when bonds are >= ${discount.toFixed(2)}%`
        );
    }
}

function askQuestion(query) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    return new Promise(resolve => rl.question(query, ans => {
        rl.close();
        resolve(ans);
    }))
}

function calculateMinimumBondDiscountWithPartialVest(APY, restakeMinutes, percentBonded, bondPeriod) {
    for (let bondDiscount = 3; bondDiscount < 100; bondDiscount += 0.01) {
        const restakePeriod = 1000 * 60 * restakeMinutes;

        const amountBonded = 100 * (percentBonded / 100);
        const amountStaked = 100 - amountBonded;

        const completeVest = calculateProfitWithPartialVest(amountStaked, amountBonded, APY, rebasesPerDay * 5, bondPeriod, restakePeriod / rebasePeriod);

        const resetVest = calculateFourFourProfit(amountBonded, amountStaked, APY, bondDiscount, rebasesPerDay * 5, restakePeriod / rebasePeriod);

        if (resetVest > completeVest) {
            return bondDiscount;
        }
    }
}

function calculateMinimumBondDiscount(APY, restakeMinutes) {
    const stakedBalance = calculateStakingProfit(100, APY, rebasesPerDay * 5);

    for (let bondDiscount = 3; bondDiscount < 20; bondDiscount += 0.01) {
        const restakePeriod = 1000 * 60 * restakeMinutes;

        const fourFourBalance = calculateFourFourProfit(0, 100, APY, bondDiscount, rebasesPerDay * 5, restakePeriod / rebasePeriod);

        if (fourFourBalance > stakedBalance) {
            return bondDiscount;
        }
    }
}

function formatPeriod(period) {
    if (period < 60) {
        return `${period} minutes`;
    }

    if (period < 1440) {
        return `${Math.floor(period / 60)} hours`;
    }

    return `${Math.floor(period / 60 / 24)} days`;
}

function calculateStakingProfit(balance, apy, blocks) {
    const rebaseRate = (1 + (APY / 100)) ** (1 / (rebasesPerDay * 365)) - 1;

    for (let i = 0; i <= blocks; i++) {
        const rebase = balance * rebaseRate;

        balance += rebase;
    }

    return balance;
}

function calculateFourFourProfit(existingBondBalance, balance, apy, bondRate, blocks, restakeBlockCount) {
    const bondBalance = existingBondBalance + balance + (balance * (bondRate / 100));

    const rebaseRate = (1 + (APY / 100)) ** (1 / (rebasesPerDay * 365)) - 1;

    let inBalance = 0;

    const claims = Math.floor(blocks / restakeBlockCount);

    for (let i = 1; i <= blocks; i++) {
        if (i % restakeBlockCount === 0) {
            inBalance += (bondBalance / claims);
        }

        const rebase = inBalance * rebaseRate;

        inBalance += rebase;
    }

    return inBalance;
}

function calculateProfitWithPartialVest(balanceStaked, balanceBonded, apy, blocks, bondBlocks, restakeBlockCount) {
    if (bondBlocks > blocks) {
        throw new Error('Bond blocks should be less than blocks');
    }

    const balanceAfterVest = calculateBalanceAfterVestComplete(balanceStaked, balanceBonded, apy, bondBlocks, restakeBlockCount);

    const balanceAfterStake = calculateStakingProfit(balanceAfterVest, apy, blocks - bondBlocks);

    return balanceAfterStake;
}

function calculateBalanceAfterVestComplete(balanceStaked, balanceBonded, apy, blocks, restakeBlockCount) {
    const bondBalance = balanceBonded;

    const rebaseRate = (1 + (APY / 100)) ** (1 / (rebasesPerDay * 365)) - 1;

    let inBalance = balanceStaked;

    const claims = Math.floor(blocks / restakeBlockCount);

    for (let i = 1; i <= blocks; i++) {
        if (i % restakeBlockCount === 0) {
            inBalance += (bondBalance / claims);
        }

        const rebase = inBalance * rebaseRate;

        inBalance += rebase;
    }

    return inBalance;
}

function formatIN(amount) {
    return `${amount.toFixed(4)} IN`;
}

main();
