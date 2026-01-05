import axios from 'axios';
import TriangularOpportunity from '../models/TriangularOpportunity.js';

// Base currencies to start triangular arbitrage from
const BASE_CURRENCIES = ['BTC', 'ETH', 'USDT', 'BNB'];

// Intermediate currencies for triangular paths
const INTERMEDIATE_CURRENCIES = ['BTC', 'ETH', 'BNB', 'SOL', 'XRP', 'ADA', 'USDT', 'USDC'];

/**
 * Fetch all ticker prices from Binance
 * @returns {Object} Price map { symbol: price }
 */
async function fetchBinancePrices() {
  try {
    const response = await axios.get('https://api.binance.com/api/v3/ticker/price');
    const priceMap = {};

    response.data.forEach(ticker => {
      priceMap[ticker.symbol] = parseFloat(ticker.price);
    });

    return priceMap;
  } catch (error) {
    console.error('Error fetching Binance prices:', error.message);
    return {};
  }
}

/**
 * Find triangular arbitrage opportunities on Binance
 * @param {Object} priceMap - Map of all trading pair prices
 * @param {string} baseCurrency - Starting currency (e.g., 'BTC')
 * @returns {Array} Triangular opportunities
 */
function findTriangularPaths(priceMap, baseCurrency) {
  const opportunities = [];

  // For each intermediate currency
  for (const intermediate of INTERMEDIATE_CURRENCIES) {
    if (intermediate === baseCurrency) continue;

    // For each final currency
    for (const finalCurrency of INTERMEDIATE_CURRENCIES) {
      if (finalCurrency === baseCurrency || finalCurrency === intermediate) continue;

      // Build the path: BASE → INTERMEDIATE → FINAL → BASE
      const path = {
        step1: `${baseCurrency}${intermediate}`,     // BTC → ETH
        step2: `${intermediate}${finalCurrency}`,     // ETH → USDT
        step3: `${finalCurrency}${baseCurrency}`,     // USDT → BTC
      };

      // Check if all pairs exist in the price map
      let step1Price = priceMap[path.step1];
      let step2Price = priceMap[path.step2];
      let step3Price = priceMap[path.step3];

      // Handle reverse pairs (e.g., BTCETH doesn't exist, but ETHBTC does)
      let step1Direction = 'forward';
      let step2Direction = 'forward';
      let step3Direction = 'forward';

      if (!step1Price) {
        const reversePair = `${intermediate}${baseCurrency}`;
        if (priceMap[reversePair]) {
          step1Price = priceMap[reversePair]; // Don't invert here - calculation function will handle it
          step1Direction = 'reverse';
          path.step1 = reversePair;
        }
      }

      if (!step2Price) {
        const reversePair = `${finalCurrency}${intermediate}`;
        if (priceMap[reversePair]) {
          step2Price = priceMap[reversePair]; // Don't invert here - calculation function will handle it
          step2Direction = 'reverse';
          path.step2 = reversePair;
        }
      }

      if (!step3Price) {
        const reversePair = `${baseCurrency}${finalCurrency}`;
        if (priceMap[reversePair]) {
          step3Price = priceMap[reversePair]; // Don't invert here - calculation function will handle it
          step3Direction = 'reverse';
          path.step3 = reversePair;
        }
      }

      // If all three pairs exist, calculate profit
      if (step1Price && step2Price && step3Price) {
        const opportunity = calculateTriangularProfit(
          baseCurrency,
          intermediate,
          finalCurrency,
          step1Price,
          step2Price,
          step3Price,
          step1Direction,
          step2Direction,
          step3Direction,
          path
        );

        if (opportunity) {
          opportunities.push(opportunity);
        }
      }
    }
  }

  return opportunities;
}

/**
 * Calculate profit for a triangular arbitrage path
 * @returns {Object|null} Opportunity or null if not profitable
 */
function calculateTriangularProfit(
  baseCurrency,
  intermediate,
  finalCurrency,
  step1Price,
  step2Price,
  step3Price,
  step1Direction,
  step2Direction,
  step3Direction,
  path
) {
  // Start with 1 unit of base currency
  let amount = 1;

  // Step 1: BASE → INTERMEDIATE
  if (step1Direction === 'forward') {
    amount = amount * step1Price; // BTC → ETH
  } else {
    amount = amount / step1Price; // BTC → ETH (reverse pair)
  }

  // Step 2: INTERMEDIATE → FINAL
  if (step2Direction === 'forward') {
    amount = amount * step2Price; // ETH → USDT
  } else {
    amount = amount / step2Price; // ETH → USDT (reverse pair)
  }

  // Step 3: FINAL → BASE
  if (step3Direction === 'forward') {
    amount = amount * step3Price; // USDT → BTC
  } else {
    amount = amount / step3Price; // USDT → BTC (reverse pair)
  }

  // Calculate raw profit
  const finalAmount = amount;
  const rawProfitPercent = ((finalAmount - 1) / 1) * 100;

  // Account for trading fees (0.1% per trade = 0.3% total for 3 trades)
  const totalFees = 0.3;
  const netProfitPercent = rawProfitPercent - totalFees;

  // Only return if profitable (threshold: 0.1% net profit)
  if (netProfitPercent <= 0.1) {
    return null;
  }

  // Calculate profit amount for $1000 trade
  const tradeAmount = 1000;
  const profitAmount = (tradeAmount * netProfitPercent) / 100;

  return {
    exchange: 'binance',
    baseCurrency,
    path: `${baseCurrency} → ${intermediate} → ${finalCurrency} → ${baseCurrency}`,
    pairs: [path.step1, path.step2, path.step3],
    step1: { pair: path.step1, price: step1Price, direction: step1Direction },
    step2: { pair: path.step2, price: step2Price, direction: step2Direction },
    step3: { pair: path.step3, price: step3Price, direction: step3Direction },
    startAmount: 1,
    endAmount: finalAmount,
    profitPercent: rawProfitPercent,
    netProfitPercent,
    profitAmount,
    tradingFees: {
      step1Fee: 0.1,
      step2Fee: 0.1,
      step3Fee: 0.1,
      totalFee: 0.3,
    },
    status: 'active',
  };
}

/**
 * Scan for triangular arbitrage opportunities on Binance
 * @returns {Array} List of triangular opportunities
 */
export async function scanTriangularArbitrage() {
  try {
    console.log('Scanning triangular arbitrage on Binance...');

    // Fetch all prices from Binance
    const priceMap = await fetchBinancePrices();

    if (Object.keys(priceMap).length === 0) {
      console.log('No price data available');
      return [];
    }

    const allOpportunities = [];

    // Find triangular paths for each base currency
    for (const baseCurrency of BASE_CURRENCIES) {
      const opportunities = findTriangularPaths(priceMap, baseCurrency);
      allOpportunities.push(...opportunities);
    }

    // Sort by profit (highest first)
    allOpportunities.sort((a, b) => b.netProfitPercent - a.netProfitPercent);

    // Take top 20 opportunities
    const topOpportunities = allOpportunities.slice(0, 20);

    // Save to database
    if (topOpportunities.length > 0) {
      await TriangularOpportunity.insertMany(topOpportunities, { ordered: false }).catch((err) => {
        if (err.code !== 11000) {
          console.error('Error inserting triangular opportunities:', err);
        }
      });
    }

    console.log(`Triangular scan complete: Found ${topOpportunities.length} opportunities`);
    return topOpportunities;
  } catch (error) {
    console.error('Triangular arbitrage scan error:', error);
    return [];
  }
}

/**
 * Get active triangular opportunities
 */
export async function getActiveTriangularOpportunities(limit = 20) {
  try {
    return await TriangularOpportunity.find({
      status: 'active',
      expiresAt: { $gt: new Date() },
    })
      .sort({ netProfitPercent: -1 })
      .limit(limit);
  } catch (error) {
    throw new Error(`Failed to get triangular opportunities: ${error.message}`);
  }
}

/**
 * Get triangular arbitrage statistics
 */
export async function getTriangularStats(days = 7) {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const opportunities = await TriangularOpportunity.find({
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
    throw new Error(`Failed to get triangular stats: ${error.message}`);
  }
}

/**
 * Mark expired triangular opportunities
 */
export async function markExpiredTriangular() {
  try {
    const result = await TriangularOpportunity.updateMany(
      {
        status: 'active',
        expiresAt: { $lte: new Date() },
      },
      {
        $set: { status: 'expired' },
      }
    );

    if (result.modifiedCount > 0) {
      console.log(`Marked ${result.modifiedCount} triangular opportunities as expired`);
    }
    return result.modifiedCount;
  } catch (error) {
    console.error('Error marking expired triangular opportunities:', error);
    return 0;
  }
}

/**
 * Delete old triangular opportunities
 */
export async function cleanupOldTriangular(days = 7) {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const result = await TriangularOpportunity.deleteMany({
      createdAt: { $lt: cutoffDate },
    });

    console.log(`Deleted ${result.deletedCount} old triangular opportunities`);
    return result.deletedCount;
  } catch (error) {
    console.error('Error cleaning up old triangular opportunities:', error);
    return 0;
  }
}
