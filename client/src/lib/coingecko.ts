export interface Coin {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number;
  market_cap: number;
  market_cap_rank: number;
  price_change_percentage_24h: number;
  high_24h: number;
  low_24h: number;
}

export const getTopCoins = async (currency: string = "usd"): Promise<Coin[]> => {
  try {
    const response = await fetch(
      `https://api.coingecko.com/api/v3/coins/markets?vs_currency=${currency}&order=market_cap_desc&per_page=10&page=1&sparkline=false`
    );
    if (!response.ok) throw new Error("Failed to fetch top coins");
    return await response.json();
  } catch (error) {
    console.error(error);
    return [];
  }
};

export const searchCoins = async (query: string, currency: string = "usd"): Promise<Coin[]> => {
  if (!query) return [];
  try {
    const response = await fetch(
      `https://api.coingecko.com/api/v3/search?query=${query}`
    );
    const data = await response.json();
    // Search endpoint returns different structure, need to fetch details for top results
    // For simplicity in this demo, we might just filter from a larger list or fetch details for the top result
    // But to keep it simple and robust without too many API calls:
    const topResult = data.coins[0];
    if (topResult) {
        const coinResponse = await fetch(`https://api.coingecko.com/api/v3/coins/markets?vs_currency=${currency}&ids=${topResult.id}`);
        return await coinResponse.json();
    }
    return [];
  } catch (error) {
    console.error(error);
    return [];
  }
};

export const getCoinDetail = async (id: string, currency: string = "usd"): Promise<Coin | null> => {
  try {
    const response = await fetch(
      `https://api.coingecko.com/api/v3/coins/markets?vs_currency=${currency}&ids=${id}`
    );
    const data = await response.json();
    return data[0] || null;
  } catch (error) {
    console.error(error);
    return null;
  }
};

export const getMarketChart = async (id: string, days: number = 1, currency: string = "usd"): Promise<{ x: number; y: number }[]> => {
  try {
    const response = await fetch(
      `https://api.coingecko.com/api/v3/coins/${id}/market_chart?vs_currency=${currency}&days=${days}`
    );
    const data = await response.json();
    return data.prices.map(([timestamp, price]: [number, number]) => ({
      x: timestamp,
      y: price,
    }));
  } catch (error) {
    console.error(error);
    return [];
  }
};
