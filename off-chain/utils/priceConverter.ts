import axios from 'axios';

interface PriceResponse {
    ton: {
        usd: number;
    };
    ethereum: {
        usd: number;
    };
}

/**
 * Fetches current prices for TON and ETH from CoinGecko
 */
async function getCurrentPrices(): Promise<PriceResponse> {
    try {
        const response = await axios.get(
            'https://api.coingecko.com/api/v3/simple/price?ids=the-open-network,ethereum&vs_currencies=usd'
        );
        return {
            ton: { usd: response.data['the-open-network'].usd },
            ethereum: { usd: response.data.ethereum.usd }
        };
    } catch (error) {
        console.error('Error fetching prices:', error);
        throw new Error('Failed to fetch current prices');
    }
}

/**
 * Convert TON amount to equivalent ETH amount based on current market prices
 * @param tonAmount Amount in TON
 * @returns Equivalent amount in ETH
 */
export async function tonToEth(tonAmount: number): Promise<number> {
    const prices = await getCurrentPrices();
    const tonUsdValue = tonAmount * prices.ton.usd;
    const ethAmount = tonUsdValue / prices.ethereum.usd;
    // Format to 18 decimal places maximum
    return Number(ethAmount.toFixed(18));
}

/**
 * Convert ETH amount to equivalent TON amount based on current market prices
 * @param ethAmount Amount in ETH
 * @returns Equivalent amount in TON
 */
export async function ethToTon(ethAmount: number): Promise<number> {
    const prices = await getCurrentPrices();
    const ethUsdValue = ethAmount * prices.ethereum.usd;
    const tonAmount = ethUsdValue / prices.ton.usd;
    // Format to 9 decimal places (TON's precision)
    return Number(tonAmount.toFixed(9));
}

// Example usage:
// const tonAmount = await ethToTon(1); // Convert 1 ETH to TON
// const ethAmount = await tonToEth(10); // Convert 10 TON to ETH
