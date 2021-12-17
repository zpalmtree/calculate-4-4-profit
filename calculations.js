export function calculateMinimumBondDiscountWithPartialVest(
    apiData,
    amountStaked,
    amountBonded,
    bondPeriod,
    restakeBlocks,
    rebasesPerDay,
) {
    const completeVest = calculateProfitWithPartialVest(
        amountStaked,
        amountBonded,
        apiData,
        rebasesPerDay * 5,
        bondPeriod,
        restakeBlocks,
    );

    for (let bondDiscount = 3.5; bondDiscount < 100; bondDiscount += 0.01) {
        const resetVest = calculateFourFourProfit(
            amountBonded,
            amountStaked,
            apiData,
            bondDiscount,
            rebasesPerDay * 5,
            restakeBlocks,
        );

        if (resetVest > completeVest) {
            return bondDiscount;
        }
    }

    return 100;
}

export function calculateMinimumBondDiscount(
    apiData,
    restakeBlocks,
    rebasesPerDay,
) {
    const stakedBalance = calculateStakingProfit(
        100,
        apiData,
        rebasesPerDay * 5,
    );

    for (let bondDiscount = 3.5; bondDiscount < 20; bondDiscount += 0.01) {
        const fourFourBalance = calculateFourFourProfit(
            0,
            100,
            apiData,
            bondDiscount,
            rebasesPerDay * 5,
            restakeBlocks,
        );

        if (fourFourBalance > stakedBalance) {
            return bondDiscount;
        }
    }

    return 100;
}

export function calculateStakingProfit(balance, apiData, blocks) {
    for (let i = 0; i <= blocks; i++) {
        balance += (balance * apiData.inRewardPerStakedIn);
    }

    return balance;
}

export function calculateFourFourProfit(existingBondBalance, balance, apiData, bondRate, blocks, restakeBlockCount) {
    const bondBalance = existingBondBalance + balance + (balance * (bondRate / 100));

    let inBalance = 0;

    const claims = Math.floor(blocks / restakeBlockCount);

    for (let i = 1; i <= blocks; i++) {
        if (i % restakeBlockCount === 0) {
            inBalance += (bondBalance / claims);
        }

        inBalance += (inBalance * apiData.inRewardPerStakedIn);
    }

    return inBalance;
}

export function calculateProfitWithPartialVest(balanceStaked, balanceBonded, apiData, blocks, bondBlocks, restakeBlockCount) {
    if (bondBlocks > blocks) {
        throw new Error('Bond blocks should be less than blocks');
    }

    const balanceAfterVest = calculateBalanceAfterVestComplete(
        balanceStaked,
        balanceBonded,
        apiData,
        bondBlocks,
        restakeBlockCount,
    );

    const balanceAfterStake = calculateStakingProfit(balanceAfterVest, apiData, blocks - bondBlocks);

    return balanceAfterStake;
}

export function calculateBalanceAfterVestComplete(balanceStaked, balanceBonded, apiData, blocks, restakeBlockCount) {
    const bondBalance = balanceBonded;

    let inBalance = balanceStaked;

    const claims = Math.floor(blocks / restakeBlockCount);

    for (let i = 1; i <= blocks; i++) {
        if (i % restakeBlockCount === 0) {
            inBalance += (bondBalance / claims);
        }

        inBalance += (inBalance * apiData.inRewardPerStakedIn);
    }

    return inBalance;
}
