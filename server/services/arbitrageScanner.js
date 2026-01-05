import axios from 'axios';
import ArbitrageOpportunity from '../models/ArbitrageOpportunity.js';

// Trading pairs to monitor (format: BTC-USDT for most exchanges)
const POPULAR_PAIRS = [
  'BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'XRPUSDT',
  'ADAUSDT', 'DOGEUSDT', 'DOTUSDT', 'MATICUSDT', 'AVAXUSDT',
  'UNIUSDT', 'LINKUSDT', 'ATOMUSDT', 'LTCUSDT', 'ETCUSDT',
];

/**
 * Fetch price from Binance (Public API - NO KEY NEEDED)
 * @param {string} symbol - Trading pair (e.g., "BTCUSDT")
 * @returns {Object} Price data
 */
async function fetchBinancePrice(symbol) {
  try {
    const response = await axios.get(`https://api.binance.com/api/v3/ticker/24hr?symbol=${symbol}`);
    const data = response.data;

    return {
      exchange: 'binance',
      symbol,
      price: parseFloat(data.lastPrice),
      volume: parseFloat(data.volume),
      change24h: parseFloat(data.priceChangePercent),
      timestamp: data.closeTime,
    };
  } catch (error) {
    console.error(`Error fetching Binance price for ${symbol}:`, error.message);
    return null;
  }
}

/**
 * Fetch price from Kraken (Public API - NO KEY NEEDED)
 * @param {string} symbol - Trading pair
 * @returns {Object} Price data
 */
async function fetchKrakenPrice(symbol) {
  try {
    // Kraken symbol mapping (Kraken doesn't support all pairs)
    const krakenPairMap = {
      'BTCUSDT': 'XBTUSDT',
      'ETHUSDT': 'ETHUSDT',
      'SOLUSDT': 'SOLUSDT',
      'XRPUSDT': 'XRPUSDT',
      'ADAUSDT': 'ADAUSDT',
      'DOGEUSDT': 'XDGUSDT',
      'DOTUSDT': 'DOTUSDT',
      'UNIUSDT': 'UNIUSDT',
      'LINKUSDT': 'LINKUSDT',
      'ATOMUSDT': 'ATOMUSDT',
      'LTCUSDT': 'LTCUSDT',
      'ETCUSDT': 'ETCUSDT',
      // Unsupported on Kraken: BNB, MATIC, AVAX
    };

    const krakenSymbol = krakenPairMap[symbol];

    // Skip unsupported pairs silently
    if (!krakenSymbol) {
      return null;
    }

    const response = await axios.get(`https://api.kraken.com/0/public/Ticker?pair=${krakenSymbol}`);
    const data = response.data;

    if (data.error && data.error.length > 0) {
      throw new Error(data.error[0]);
    }

    const pairData = Object.values(data.result)[0];

    return {
      exchange: 'kraken',
      symbol,
      price: parseFloat(pairData.c[0]), // Last trade price
      volume: parseFloat(pairData.v[1]), // 24h volume
      change24h: 0, // Kraken doesn't provide this directly
      timestamp: Date.now(),
    };
  } catch (error) {
    console.error(`Error fetching Kraken price for ${symbol}:`, error.message);
    return null;
  }
}

/**
 * Fetch price from Coinbase (Public API - NO KEY NEEDED)
 * @param {string} symbol - Trading pair
 * @returns {Object} Price data
 */
async function fetchCoinbasePrice(symbol) {
  try {
    // Convert BTCUSDT to BTC-USD (Coinbase uses USD, not USDT)
    const coin = symbol.replace('USDT', '');
    const coinbaseSymbol = `${coin}-USD`;

    const response = await axios.get(`https://api.coinbase.com/v2/prices/${coinbaseSymbol}/spot`);
    const data = response.data;

    return {
      exchange: 'coinbase',
      symbol,
      price: parseFloat(data.data.amount),
      volume: 0, // Coinbase spot API doesn't provide volume
      change24h: 0,
      timestamp: Date.now(),
    };
  } catch (error) {
    console.error(`Error fetching Coinbase price for ${symbol}:`, error.message);
    return null;
  }
}

/**
 * Fetch price from CoinGecko (Free API - NO KEY NEEDED)
 * @param {string} symbol - Trading pair
 * @returns {Object} Price data
 */
async function fetchCoinGeckoPrice(symbol) {
  try {
    // Map symbols to CoinGecko IDs
    const coinMap = {
      BTC: 'bitcoin',
      ETH: 'ethereum',
      BNB: 'binancecoin',
      SOL: 'solana',
      XRP: 'ripple',
      ADA: 'cardano',
      DOGE: 'dogecoin',
      DOT: 'polkadot',
      MATIC: 'matic-network',
      AVAX: 'avalanche-2',
      UNI: 'uniswap',
      LINK: 'chainlink',
      ATOM: 'cosmos',
      LTC: 'litecoin',
      ETC: 'ethereum-classic',
    };

    const coinId = coinMap[symbol.replace('USDT', '')];
    if (!coinId) return null;

    const response = await axios.get(
      `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd&include_24hr_vol=true&include_24hr_change=true`
    );

    const data = response.data[coinId];

    return {
      exchange: 'coingecko',
      symbol,
      price: data.usd,
      volume: data.usd_24h_vol || 0,
      change24h: data.usd_24h_change || 0,
      timestamp: Date.now(),
    };
  } catch (error) {
    console.error(`Error fetching CoinGecko price for ${symbol}:`, error.message);
    return null;
  }
}

/**
 * Fetch price from CoinCap (Already exists in your system - Free API)
 * @param {string} symbol - Trading pair
 * @returns {Object} Price data
 */
async function fetchCoinCapPrice(symbol) {
  try {
    const coinId = symbol.replace('USDT', '').toLowerCase();

    const response = await axios.get(`https://api.coincap.io/v2/assets/${coinId}`);
    const data = response.data.data;

    return {
      exchange: 'coincap',
      symbol,
      price: parseFloat(data.priceUsd),
      volume: parseFloat(data.volumeUsd24Hr),
      change24h: parseFloat(data.changePercent24Hr),
      timestamp: data.timestamp,
    };
  } catch (error) {
    console.error(`Error fetching CoinCap price for ${symbol}:`, error.message);
    return null;
  }
}

/**
 * Fetch prices from all exchanges for a symbol
 * @param {string} symbol - Trading pair
 * @returns {Array} Array of price data from different exchanges
 */
async function fetchAllPrices(symbol) {
  const prices = await Promise.all([
    fetchBinancePrice(symbol),
    fetchKrakenPrice(symbol),
    fetchCoinbasePrice(symbol),
    // fetchCoinGeckoPrice(symbol), // Can enable if needed
    // fetchCoinCapPrice(symbol), // Can enable if needed
  ]);

  // Filter out null values (failed requests)
  return prices.filter((p) => p !== null);
}

/**
 * Scan all exchanges for arbitrage opportunities
 * @param {Array} customPairs - Optional custom trading pairs
 * @returns {Array} List of arbitrage opportunities
 */
export async function scanArbitrage(customPairs = null) {
  try {
    const pairsToScan = customPairs || POPULAR_PAIRS;

    const opportunities = [];

    // Scan each trading pair
    for (const symbol of pairsToScan) {
      try {
        const prices = await fetchAllPrices(symbol);

        if (prices.length < 2) {
          console.log(`Not enough price data for ${symbol}, skipping...`);
          continue;
        }

        const opportunity = findArbitrageInPrices(symbol, prices);
        if (opportunity) {
          opportunities.push(opportunity);
        }
      } catch (error) {
        console.error(`Error scanning ${symbol}:`, error.message);
      }
    }

    // Save opportunities to database
    if (opportunities.length > 0) {
      await ArbitrageOpportunity.insertMany(opportunities, { ordered: false }).catch((err) => {
        if (err.code !== 11000) {
          console.error('Error inserting opportunities:', err);
        }
      });
    }

    console.log(`Scan complete: Found ${opportunities.length} opportunities`);
    return opportunities;
  } catch (error) {
    console.error('Arbitrage scan error:', error);
    throw new Error(`Failed to scan arbitrage: ${error.message}`);
  }
}

/**
 * Find arbitrage opportunity from price data
 * @param {string} symbol - Trading pair
 * @param {Array} prices - Price data from different exchanges
 * @returns {Object|null} Arbitrage opportunity or null
 */
function findArbitrageInPrices(symbol, prices) {
  if (prices.length < 2) return null;

  // Find lowest and highest prices
  const lowestPrice = prices.reduce((min, p) => (p.price < min.price ? p : min));
  const highestPrice = prices.reduce((max, p) => (p.price > max.price ? p : max));

  // Don't compare same exchange
  if (lowestPrice.exchange === highestPrice.exchange) {
    return null;
  }

  // Calculate profit percentage
  const rawProfitPercent = ((highestPrice.price - lowestPrice.price) / lowestPrice.price) * 100;

  // Assume 0.1% fee per exchange (0.2% total)
  const totalFees = 0.2;

  // Net profit after fees
  const netProfitPercent = rawProfitPercent - totalFees;

  // Only return if profitable (> -100 = show ALL including losses)
  // Change to 0.05 for small profits, 0.5 for highly profitable only
  if (netProfitPercent <= -100) {
    return null;
  }

  // Estimate profit amount for $1000 trade
  const tradeAmount = 1000;
  const profitAmount = (tradeAmount * netProfitPercent) / 100;

  // Determine liquidity based on volume
  let liquidity = 'low';
  const avgVolume = prices.reduce((sum, p) => sum + p.volume, 0) / prices.length;
  if (avgVolume > 100000) liquidity = 'medium';
  if (avgVolume > 1000000) liquidity = 'high';

  return {
    userId: null,
    symbol: symbol.replace('USDT', '/USDT'), // Format for display
    buyExchange: lowestPrice.exchange,
    buyPrice: lowestPrice.price,
    sellExchange: highestPrice.exchange,
    sellPrice: highestPrice.price,
    profitPercent: rawProfitPercent,
    profitAmount,
    tradingFees: {
      buyFee: 0.1,
      sellFee: 0.1,
    },
    netProfitPercent,
    volume24h: avgVolume,
    liquidity,
    status: 'active',
  };
}

/**
 * Get active opportunities
 */
export async function getActiveOpportunities(userId = null, limit = 20) {
  try {
    return await ArbitrageOpportunity.find({
      userId: null,
      status: 'active',
      expiresAt: { $gt: new Date() },
    })
      .sort({ netProfitPercent: -1 })
      .limit(limit);
  } catch (error) {
    throw new Error(`Failed to get active opportunities: ${error.message}`);
  }
}

/**
 * Get opportunity history
 */
export async function getOpportunityHistory(days = 7, limit = 100) {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    return await ArbitrageOpportunity.find({
      userId: null,
      createdAt: { $gte: startDate },
    })
      .sort({ createdAt: -1 })
      .limit(limit);
  } catch (error) {
    throw new Error(`Failed to get opportunity history: ${error.message}`);
  }
}

/**
 * Mark expired opportunities
 */
export async function markExpiredOpportunities() {
  try {
    const result = await ArbitrageOpportunity.updateMany(
      {
        status: 'active',
        expiresAt: { $lte: new Date() },
      },
      {
        $set: { status: 'expired' },
      }
    );

    if (result.modifiedCount > 0) {
      console.log(`Marked ${result.modifiedCount} opportunities as expired`);
    }
    return result.modifiedCount;
  } catch (error) {
    console.error('Error marking expired opportunities:', error);
    return 0;
  }
}

/**
 * Get arbitrage statistics
 */
export async function getArbitrageStats(days = 7) {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const opportunities = await ArbitrageOpportunity.find({
      userId: null,
      createdAt: { $gte: startDate },
    });

    const totalOpportunities = opportunities.length;
    const activeOpportunities = opportunities.filter((opp) => opp.status === 'active').length;

    const avgProfit =
      totalOpportunities > 0
        ? opportunities.reduce((sum, opp) => sum + opp.netProfitPercent, 0) / totalOpportunities
        : 0;

    const maxProfit = totalOpportunities > 0 ? Math.max(...opportunities.map((opp) => opp.netProfitPercent)) : 0;

    return {
      totalOpportunities,
      activeOpportunities,
      averageProfitPercent: avgProfit.toFixed(2),
      maxProfitPercent: maxProfit.toFixed(2),
      period: `Last ${days} days`,
    };
  } catch (error) {
    throw new Error(`Failed to get arbitrage stats: ${error.message}`);
  }
}

/**
 * Delete old opportunities
 */
export async function cleanupOldOpportunities(days = 7) {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const result = await ArbitrageOpportunity.deleteMany({
      createdAt: { $lt: cutoffDate },
    });

    console.log(`Deleted ${result.deletedCount} old opportunities`);
    return result.deletedCount;
  } catch (error) {
    console.error('Error cleaning up old opportunities:', error);
    return 0;
  }
}
