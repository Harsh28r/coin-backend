import cron from 'node-cron';
import { scanArbitrage, markExpiredOpportunities } from '../services/arbitrageScanner.js';
import { scanTriangularArbitrage, markExpiredTriangular } from '../services/triangularScanner.js';

/**
 * Initialize scanner cron jobs
 */
export function initializeScannerJobs() {
  // Scan for arbitrage opportunities every 30 seconds
  cron.schedule('*/30 * * * * *', async () => {
    try {
      console.log('Running arbitrage scan...');
      const opportunities = await scanArbitrage();
      console.log(`Scan complete: Found ${opportunities.length} opportunities`);
    } catch (error) {
      console.error('Scanner job error:', error.message);
    }
  });

  // Mark expired opportunities every 1 minute
  cron.schedule('*/1 * * * *', async () => {
    try {
      const expiredCount = await markExpiredOpportunities();
      if (expiredCount > 0) {
        console.log(`Marked ${expiredCount} opportunities as expired`);
      }
    } catch (error) {
      console.error('Expiration job error:', error.message);
    }
  });

  // Scan for triangular arbitrage opportunities every 30 seconds
  cron.schedule('*/30 * * * * *', async () => {
    try {
      console.log('Running triangular arbitrage scan...');
      const opportunities = await scanTriangularArbitrage();
      console.log(`Triangular scan complete: Found ${opportunities.length} opportunities`);
    } catch (error) {
      console.error('Triangular scanner job error:', error.message);
    }
  });

  // Mark expired triangular opportunities every 1 minute
  cron.schedule('*/1 * * * *', async () => {
    try {
      const expiredCount = await markExpiredTriangular();
      if (expiredCount > 0) {
        console.log(`Marked ${expiredCount} triangular opportunities as expired`);
      }
    } catch (error) {
      console.error('Triangular expiration job error:', error.message);
    }
  });

  console.log('Scanner cron jobs initialized');
  console.log('- Cross-exchange arbitrage scan: every 30 seconds');
  console.log('- Triangular arbitrage scan: every 30 seconds');
  console.log('- Mark expired opportunities: every 1 minute');
}
