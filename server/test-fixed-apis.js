// Quick test to verify API fixes
import axios from 'axios';

console.log('Testing API fixes...\n');

// Test Coinbase with USD format
async function testCoinbaseFixed() {
  try {
    console.log('Testing Coinbase (BTC-USD)...');
    const response = await axios.get('https://api.coinbase.com/v2/prices/BTC-USD/spot');
    console.log('✅ Coinbase BTC-USD Price:', response.data.data.amount);
    return true;
  } catch (error) {
    console.error('❌ Coinbase Error:', error.message);
    return false;
  }
}

// Test Kraken with proper symbol mapping
async function testKrakenFixed() {
  try {
    console.log('Testing Kraken (XBTUSDT)...');
    const response = await axios.get('https://api.kraken.com/0/public/Ticker?pair=XBTUSDT');
    const price = Object.values(response.data.result)[0].c[0];
    console.log('✅ Kraken XBTUSDT Price:', price);
    return true;
  } catch (error) {
    console.error('❌ Kraken Error:', error.message);
    return false;
  }
}

async function runTests() {
  const coinbaseOk = await testCoinbaseFixed();
  const krakenOk = await testKrakenFixed();

  console.log('\n' + '='.repeat(50));
  if (coinbaseOk && krakenOk) {
    console.log('✅ All API fixes working! Restart the server.');
  } else {
    console.log('❌ Some APIs still failing. Check errors above.');
  }
}

runTests();
