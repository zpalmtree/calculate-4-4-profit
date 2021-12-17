import {
    calculateMinimumBondDiscountWithPartialVest,
    calculateMinimumBondDiscount,
    calculateStakingProfit,
    calculateFourFourProfit,
    calculateProfitWithPartialVest,
    calculateBalanceAfterVestComplete,
} from './calculations.js';
import {
    askQuestion,
    formatPeriod,
    formatIN,
    parseTimeString,
    parseNumber,
} from './utilities.js';
import {
    fetchCurrentBlockTime,
    fetchAPIData,
} from './fetch-data.js';
import {
    getHaveExistingBond,
    getRebondRate,
    getBondRate,
} from './input.js';

const restakePeriod = 60;

/* 1000 ms * 60 seconds * 60 minutes */
const defaultRestakePeriod = 1000 * 60 * restakePeriod;

async function main() {
    const solanaBlockTime = await fetchCurrentBlockTime();
    const restakeBlocks = Math.floor(defaultRestakePeriod / solanaBlockTime);
    const rebasesPerDay = Math.floor((1000 * 60 * 60 * 24) / solanaBlockTime);

    const apiData = await fetchAPIData();

    const action = await askQuestion('Action?: ');

    switch (action) {
        case 'yearly': {
            calculateYearlyStake(apiData, solanaBlockTime, rebasesPerDay);
            break;
        }
        case 'profit': {
            calculateFourFourBonusIN(apiData, solanaBlockTime, restakeBlocks, rebasesPerDay);
            break;
        }
        case 'bond': {
            gimmeTheBestBondDiscounts(apiData, solanaBlockTime, restakeBlocks, rebasesPerDay);
            break;
        }
    }
}

async function calculateYearlyStake(apiData, solanaBlockTime, rebasesPerDay) {
    const staked = await askQuestion('How much IN are you currently staking?: ');
    const stakedNum = parseNumber(staked);

    const stakedBalance = calculateStakingProfit(stakedNum, apiData, rebasesPerDay * 365);

    console.log(`With an APY of ${apiData.apy.toFixed(0)}%, and a solana block time of ${solanaBlockTime}ms, ` +
        `you will have approximately ${formatIN(stakedBalance)} after a year of staking.`
    );
}

async function calculateFourFourBonusIN(apiData, solanaBlockTime, restakeBlocks, rebasesPerDay) {
    const staked = await askQuestion('How much IN are you currently staking?: ');
    const stakedNum = parseNumber(staked);

    const bondDiscount = await getBondRate();

    const rebondTime = await getRebondRate(solanaBlockTime);

    const haveBond = await getHaveExistingBond();

    if (!haveBond) {
        const stakedBalance = calculateStakingProfit(stakedNum, apiData, rebasesPerDay * 5);
        const fourFourBalance = calculateFourFourProfit(0, stakedNum, apiData, bondDiscount, rebasesPerDay * 5, rebondTime);

        const profit = fourFourBalance - stakedBalance;

        console.log(`After 5 days, you would make ${formatIN(profit)} more with (4,4) than (3,3) - ${formatIN(fourFourBalance)} vs ${formatIN(stakedBalance)}`);
    } else {
        const bonded = await askQuestion('How much IN is pending in bonds?: ');

        const bondedNum = parseNumber(bonded);

        const time = await askQuestion('How many days/hours does your bond have remaining? (e.g. 2d10h): ');

        const timeParsed = parseTimeString(time);

        const percentBonded = (bondedNum / (stakedNum + bondedNum)) * 100;

        const bondPeriod = (timeParsed * 1000) / solanaBlockTime;

        const completeVest = calculateProfitWithPartialVest(stakedNum, bondedNum, apiData, rebasesPerDay * 5, bondPeriod, rebondTime);
        const resetVest = calculateFourFourProfit(bondedNum, stakedNum, apiData, bondDiscount, rebasesPerDay * 5, rebondTime);

        const profit = resetVest - completeVest;

        if (profit > 0) {
            console.log(`After 5 days, you would make ${formatIN(profit)} more with (4,4) than (3,3) - ${formatIN(resetVest)} vs ${formatIN(completeVest)}`);
        } else {
            console.log(`After 5 days, you would make ${formatIN(Math.abs(profit))} less with (4,4) than (3,3) - ${formatIN(resetVest)} vs ${formatIN(completeVest)}`);
        }
    }
}

async function gimmeTheBestBondDiscounts(apiData, solanaBlockTime, restakeBlocks, rebasesPerDay) {
    const haveBond = await getHaveExistingBond();

    if (!haveBond) {
        const discount = calculateMinimumBondDiscount(
            apiData,
            restakeBlocks,
            rebasesPerDay,
        );

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

        const bondPeriod = Math.floor((timeParsed * 1000) / solanaBlockTime);

        const discount = calculateMinimumBondDiscountWithPartialVest(
            apiData,
            stakedNum,
            bondedNum,
            bondPeriod,
            restakeBlocks,
            rebasesPerDay,
        );

        console.log(`With a restake period of ${formatPeriod(restakePeriod)}, an APY of ${apiData.apy.toFixed(0)}%, and ` +
            `${percentBonded.toFixed(1)}% of your IN locked up in bonds with ` +
            `${formatPeriod(timeParsed / 60)} remaining, (4,4) is more profitable ` +
            `than (3,3) when bonds are >= ${discount.toFixed(2)}%`
        );
    }
}

main();
