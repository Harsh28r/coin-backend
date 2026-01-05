import ccxt from 'ccxt';
import { decrypt } from '../middleware/encryptionHelper.js';
import ExchangeAPI from '../models/ExchangeAPI.js';

/**
 * Initialize exchange instance using encrypted API keys
 * @param {string} exchangeName - Exchange name (binance, coinbase, etc.)
 * @param {string} encryptedApiKey - Encrypted API key
 * @param {string} encryptedApiSecret - Encrypted API secret
 * @param {string} encryptedPassphrase - Encrypted passphrase (optional)
 * @returns {Object} CCXT exchange instance
 */
export function initializeExchange(exchangeName, encryptedApiKey, encryptedApiSecret, encryptedPassphrase = null) {
  try {
    const ExchangeClass = ccxt[exchangeName];
    if (!ExchangeClass) {
      throw new Error(`Exchange ${exchangeName} not supported`);
    }

    const config = {
      apiKey: decrypt(encryptedApiKey),
      secret: decrypt(encryptedApiSecret),
      enableRateLimit: true,
      timeout: 30000,
    };

    // Add passphrase for exchanges that require it (e.g., Coinbase Pro)
    if (encryptedPassphrase) {
      config.password = decrypt(encryptedPassphrase);
    }

    return new ExchangeClass(config);
  } catch (error) {
    console.error(`Error initializing exchange ${exchangeName}:`, error.message);
    throw new Error(`Failed to initialize exchange: ${error.message}`);
  }
}

/**
 * Get user's exchange instance from database
 * @param {string} userId - User ID
 * @param {string} exchangeName - Exchange name
 * @returns {Object} CCXT exchange instance
 */
export async function getUserExchange(userId, exchangeName) {
  try {
    const exchangeAPI = await ExchangeAPI.findOne({
      userId,
      exchangeName: exchangeName.toLowerCase(),
      isActive: true,
    });

    if (!exchangeAPI) {
      throw new Error(`Exchange ${exchangeName} not found for user`);
    }

    return initializeExchange(
      exchangeAPI.exchangeName,
      exchangeAPI.apiKey,
      exchangeAPI.apiSecret,
      exchangeAPI.apiPassphrase
    );
  } catch (error) {
    throw new Error(`Error getting user exchange: ${error.message}`);
  }
}

/**
 * Test exchange API keys by fetching balance
 * @param {Object} exchange - CCXT exchange instance
 * @returns {Object} Test result
 */
export async function testExchangeConnection(exchange) {
  try {
    await exchange.loadMarkets();
    const balance = await exchange.fetchBalance();
    return {
      success: true,
      message: 'API keys are valid',
      balance: balance.total,
    };
  } catch (error) {
    console.error('Exchange connection test failed:', error.message);
    return {
      success: false,
      message: error.message,
    };
  }
}

/**
 * Get ticker price for a symbol
 * @param {Object} exchange - CCXT exchange instance
 * @param {string} symbol - Trading pair symbol (e.g., "BTC/USDT")
 * @returns {Object} Ticker data
 */
export async function getPrice(exchange, symbol) {
  try {
    const ticker = await exchange.fetchTicker(symbol);
    return {
      symbol,
      price: ticker.last,
      bid: ticker.bid,
      ask: ticker.ask,
      volume: ticker.baseVolume,
      timestamp: ticker.timestamp,
    };
  } catch (error) {
    console.error(`Error fetching price for ${symbol}:`, error.message);
    throw new Error(`Failed to fetch price: ${error.message}`);
  }
}

/**
 * Get prices for multiple symbols
 * @param {Object} exchange - CCXT exchange instance
 * @param {Array} symbols - Array of trading pairs
 * @returns {Array} Array of price data
 */
export async function getPrices(exchange, symbols) {
  try {
    const prices = [];
    for (const symbol of symbols) {
      try {
        const priceData = await getPrice(exchange, symbol);
        prices.push(priceData);
      } catch (error) {
        console.error(`Error fetching ${symbol}:`, error.message);
        // Continue with other symbols
      }
    }
    return prices;
  } catch (error) {
    throw new Error(`Error fetching prices: ${error.message}`);
  }
}

/**
 * Get user's balance on exchange
 * @param {Object} exchange - CCXT exchange instance
 * @returns {Object} Balance data
 */
export async function getBalance(exchange) {
  try {
    const balance = await exchange.fetchBalance();
    return {
      total: balance.total,
      free: balance.free,
      used: balance.used,
    };
  } catch (error) {
    console.error('Error fetching balance:', error.message);
    throw new Error(`Failed to fetch balance: ${error.message}`);
  }
}

/**
 * Create a market buy order
 * @param {Object} exchange - CCXT exchange instance
 * @param {string} symbol - Trading pair
 * @param {number} amount - Amount to buy
 * @returns {Object} Order details
 */
export async function createBuyOrder(exchange, symbol, amount) {
  try {
    const order = await exchange.createMarketBuyOrder(symbol, amount);
    return {
      orderId: order.id,
      symbol: order.symbol,
      type: order.type,
      side: order.side,
      amount: order.amount,
      price: order.price,
      cost: order.cost,
      status: order.status,
      timestamp: order.timestamp,
    };
  } catch (error) {
    console.error('Error creating buy order:', error.message);
    throw new Error(`Failed to create buy order: ${error.message}`);
  }
}

/**
 * Create a market sell order
 * @param {Object} exchange - CCXT exchange instance
 * @param {string} symbol - Trading pair
 * @param {number} amount - Amount to sell
 * @returns {Object} Order details
 */
export async function createSellOrder(exchange, symbol, amount) {
  try {
    const order = await exchange.createMarketSellOrder(symbol, amount);
    return {
      orderId: order.id,
      symbol: order.symbol,
      type: order.type,
      side: order.side,
      amount: order.amount,
      price: order.price,
      cost: order.cost,
      status: order.status,
      timestamp: order.timestamp,
    };
  } catch (error) {
    console.error('Error creating sell order:', error.message);
    throw new Error(`Failed to create sell order: ${error.message}`);
  }
}

/**
 * Get all available trading pairs on exchange
 * @param {Object} exchange - CCXT exchange instance
 * @returns {Array} List of symbols
 */
export async function getAvailablePairs(exchange) {
  try {
    await exchange.loadMarkets();
    return Object.keys(exchange.markets);
  } catch (error) {
    console.error('Error fetching available pairs:', error.message);
    throw new Error(`Failed to fetch available pairs: ${error.message}`);
  }
}

/**
 * Get trading fees for an exchange
 * @param {Object} exchange - CCXT exchange instance
 * @param {string} symbol - Trading pair
 * @returns {Object} Fee information
 */
export async function getTradingFees(exchange, symbol) {
  try {
    await exchange.loadMarkets();
    const market = exchange.market(symbol);
    return {
      maker: market.maker || 0.001, // Default 0.1%
      taker: market.taker || 0.001,
    };
  } catch (error) {
    console.error('Error fetching trading fees:', error.message);
    return {
      maker: 0.001,
      taker: 0.001,
    };
  }
}
