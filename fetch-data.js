import fetch from 'node-fetch';
import { Connection } from '@solana/web3.js';

export const RPC_URL = 'https://ssc-dao.genesysgo.net/';

export async function fetchNearbyBlock(connection, slot) {
    try {
        const { 
            blockHeight,
            blockTime,
            parentSlot,
        } = await connection.getBlock(slot);

        return {
            blockHeight,
            blockTime,
            parentSlot,
        }
    } catch (err) {
        console.log(err);
        return fetchNearbyBlock(connection, slot - 1);
    }
}

export async function fetchCurrentBlockTime() {
    const connection = new Connection(RPC_URL);

    const now = new Date();

    const slotHeight = await connection.getSlot();

    const a = await fetchNearbyBlock(connection, slotHeight - 1);

    /* "Estimated" length of 1 day worth of blocks - but not all slots will
    * be filled. */
    const windowLength = 2.5 * 60 * 60 * 24 * 1;

    const b = await fetchNearbyBlock(connection, slotHeight - 1 - windowLength);

    const blocksPassed = a.blockHeight - b.blockHeight;
    const timePassed = a.blockTime - b.blockTime;

    const blockTime = (timePassed / blocksPassed) * 1000;

    return blockTime.toFixed(0);
}

export async function fetchAPIData() {
    const res = await fetch('https://api.invictusdao.fi/api/dashboard');
    const data = await res.json();

    const apy = Number(data.apy);
    const inPerBlock = Number(data.rewardRate);
    const supply = Number(data.supply);

    const stakedIN = supply * Number(data.stakedPercent) / 100;

    const inRewardPerStakedIn = inPerBlock / stakedIN;

    return {
        inRewardPerStakedIn,
        apy,
    };
}
