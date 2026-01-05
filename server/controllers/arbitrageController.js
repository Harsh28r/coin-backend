import {
  scanArbitrage,
  getActiveOpportunities,
  getOpportunityHistory,
  getArbitrageStats,
  cleanupOldOpportunities,
} from '../services/arbitrageScanner.js';
import ArbitrageOpportunity from '../models/ArbitrageOpportunity.js';

/**
 * Scan for arbitrage opportunities (platform-wide scan)
 * GET /arbitrage/scan
 */
export async function scanOpportunities(req, res) {
  try {
    const { pairs } = req.query; // Optional custom pairs

    const customPairs = pairs ? pairs.split(',') : null;

    const opportunities = await scanArbitrage(customPairs);

    res.status(200).json({
      success: true,
      message: `Found ${opportunities.length} arbitrage opportunities`,
      count: opportunities.length,
      data: opportunities,
    });
  } catch (error) {
    console.error('Scan arbitrage error:', error);
    res.status(500).json({
      success: false,
      message: 'Error scanning for arbitrage opportunities',
      error: error.message,
    });
  }
}

/**
 * Get active arbitrage opportunities
 * GET /arbitrage/opportunities
 */
export async function getOpportunities(req, res) {
  try {
    const limit = parseInt(req.query.limit) || 20;

    const opportunities = await getActiveOpportunities(null, limit);

    res.status(200).json({
      success: true,
      count: opportunities.length,
      data: opportunities,
    });
  } catch (error) {
    console.error('Get opportunities error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching arbitrage opportunities',
      error: error.message,
    });
  }
}

/**
 * Get arbitrage opportunity history
 * GET /arbitrage/history
 */
export async function getHistory(req, res) {
  try {
    const days = parseInt(req.query.days) || 7;
    const limit = parseInt(req.query.limit) || 100;

    const history = await getOpportunityHistory(days, limit);

    res.status(200).json({
      success: true,
      count: history.length,
      data: history,
    });
  } catch (error) {
    console.error('Get history error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching arbitrage history',
      error: error.message,
    });
  }
}

/**
 * Get arbitrage statistics
 * GET /arbitrage/stats
 */
export async function getStats(req, res) {
  try {
    const days = parseInt(req.query.days) || 7;

    const stats = await getArbitrageStats(days);

    res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching arbitrage statistics',
      error: error.message,
    });
  }
}

/**
 * Get a single arbitrage opportunity by ID
 * GET /arbitrage/opportunity/:id
 */
export async function getOpportunityById(req, res) {
  try {
    const { id } = req.params;

    const opportunity = await ArbitrageOpportunity.findById(id);

    if (!opportunity) {
      return res.status(404).json({
        success: false,
        message: 'Opportunity not found',
      });
    }

    res.status(200).json({
      success: true,
      data: opportunity,
    });
  } catch (error) {
    console.error('Get opportunity by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching opportunity',
      error: error.message,
    });
  }
}

/**
 * Delete expired opportunities (admin only)
 * DELETE /arbitrage/cleanup
 */
export async function cleanupExpired(req, res) {
  try {
    const days = parseInt(req.query.days) || 7;

    const deletedCount = await cleanupOldOpportunities(days);

    res.status(200).json({
      success: true,
      message: `Deleted ${deletedCount} old opportunities`,
      deletedCount,
    });
  } catch (error) {
    console.error('Cleanup error:', error);
    res.status(500).json({
      success: false,
      message: 'Error cleaning up old opportunities',
      error: error.message,
    });
  }
}
