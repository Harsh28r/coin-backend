// Test script to debug the arbitrage scanner
import axios from 'axios';

console.log('🔍 Testing Arbitrage Scanner...\n');

// Test Binance
async function testBinance() {
  try {
    console.log('Testing Binance API...');
    const response = await axios.get('https://api.binance.com/api/v3/ticker/24hr?symbol=BTCUSDT');
    console.log('✅ Binance BTC Price:', response.data.lastPrice);
    return parseFloat(response.data.lastPrice);
  } catch (error) {
    console.error('❌ Binance Error:', error.message);
    return null;
  }
}

// Test Kraken
async function testKraken() {
  try {
    console.log('Testing Kraken API...');
    const response = await axios.get('https://api.kraken.com/0/public/Ticker?pair=XBTUSDT');
    const price = Object.values(response.data.result)[0].c[0];
    console.log('✅ Kraken BTC Price:', price);
    return parseFloat(price);
  } catch (error) {
    console.error('❌ Kraken Error:', error.message);
    return null;
  }
}

// Test Coinbase
async function testCoinbase() {
  try {
    console.log('Testing Coinbase API...');
    const response = await axios.get('https://api.coinbase.com/v2/prices/BTC-USD/spot');
    console.log('✅ Coinbase BTC Price:', response.data.data.amount);
    return parseFloat(response.data.data.amount);
  } catch (error) {
    console.error('❌ Coinbase Error:', error.message);
    return null;
  }
}

// Calculate arbitrage
async function calculateArbitrage() {
  console.log('\n📊 Fetching prices from all exchanges...\n');

  const [binance, kraken, coinbase] = await Promise.all([
    testBinance(),
    testKraken(),
    testCoinbase()
  ]);

  console.log('\n💰 Price Comparison:');
  console.log('━'.repeat(50));

  const prices = [];
  if (binance) prices.push({ exchange: 'Binance', price: binance });
  if (kraken) prices.push({ exchange: 'Kraken', price: kraken });
  if (coinbase) prices.push({ exchange: 'Coinbase', price: coinbase });

  if (prices.length < 2) {
    console.log('❌ Not enough price data!');
    return;
  }

  // Find min and max
  const lowest = prices.reduce((min, p) => p.price < min.price ? p : min);
  const highest = prices.reduce((max, p) => p.price > max.price ? p : max);

  console.log(`Lowest:  ${lowest.exchange} - $${lowest.price.toLocaleString()}`);
  console.log(`Highest: ${highest.exchange} - $${highest.price.toLocaleString()}`);

  // Calculate profit
  const rawProfit = ((highest.price - lowest.price) / lowest.price) * 100;
  const fees = 0.2; // 0.1% per exchange
  const netProfit = rawProfit - fees;

  console.log('\n📈 Arbitrage Analysis:');
  console.log('━'.repeat(50));
  console.log(`Raw Profit:       ${rawProfit.toFixed(4)}%`);
  console.log(`Trading Fees:     ${fees}%`);
  console.log(`Net Profit:       ${netProfit.toFixed(4)}%`);
  console.log(`Profit on $1000:  $${((1000 * netProfit) / 100).toFixed(2)}`);

  if (netProfit > 0.5) {
    console.log('\n✅ PROFITABLE OPPORTUNITY FOUND!');
  } else {
    console.log('\n❌ Not profitable (threshold: 0.5%)');
    console.log(`💡 Current profit ${netProfit.toFixed(4)}% is below 0.5% threshold`);
  }
}

// Run the test
calculateArbitrage().then(() => {
  console.log('\n✅ Test complete!\n');
}).catch(err => {
  console.error('❌ Test failed:', err.message);
});
