// Test triangular arbitrage scanner
import { scanTriangularArbitrage } from './services/triangularScanner.js';

console.log('🔺 Testing Triangular Arbitrage Scanner...\n');

async function testTriangularScanner() {
  try {
    console.log('Scanning for triangular arbitrage opportunities on Binance...\n');

    const opportunities = await scanTriangularArbitrage();

    if (opportunities.length === 0) {
      console.log('❌ No triangular opportunities found (this is normal - they are rare)');
      console.log('💡 The scanner looks for cycles like BTC→ETH→USDT→BTC with >0.1% profit\n');
    } else {
      console.log(`✅ Found ${opportunities.length} triangular opportunities!\n`);
      console.log('Top 5 Opportunities:');
      console.log('━'.repeat(80));

      opportunities.slice(0, 5).forEach((opp, index) => {
        console.log(`\n${index + 1}. ${opp.path}`);
        console.log(`   Exchange: ${opp.exchange.toUpperCase()}`);
        console.log(`   Step 1: ${opp.step1.pair} @ ${opp.step1.price.toFixed(6)}`);
        console.log(`   Step 2: ${opp.step2.pair} @ ${opp.step2.price.toFixed(6)}`);
        console.log(`   Step 3: ${opp.step3.pair} @ ${opp.step3.price.toFixed(6)}`);
        console.log(`   Raw Profit: ${opp.profitPercent.toFixed(4)}%`);
        console.log(`   Net Profit: ${opp.netProfitPercent.toFixed(4)}% (after 0.3% fees)`);
        console.log(`   Profit on $1000: $${opp.profitAmount.toFixed(2)}`);
        console.log(`   Start: ${opp.startAmount} ${opp.baseCurrency} → End: ${opp.endAmount.toFixed(6)} ${opp.baseCurrency}`);
      });
    }

    console.log('\n━'.repeat(80));
    console.log('✅ Test complete!\n');
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error);
  }
}

testTriangularScanner();
