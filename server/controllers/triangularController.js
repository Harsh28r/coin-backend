import {
  scanTriangularArbitrage,
  getActiveTriangularOpportunities,
  getTriangularStats,
  markExpiredTriangular,
  cleanupOldTriangular,
} from '../services/triangularScanner.js';

/**
 * @route   GET /api/triangular/scan
 * @desc    Trigger manual triangular arbitrage scan
 * @access  Admin only
 */
export async function scanTriangularOpportunities(req, res) {
  try {
    const opportunities = await scanTriangularArbitrage();

    res.status(200).json({
      success: true,
      count: opportunities.length,
      data: opportunities,
      message: `Found ${opportunities.length} triangular arbitrage opportunities`,
    });
  } catch (error) {
    console.error('Scan triangular opportunities error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to scan triangular opportunities',
    });
  }
}

/**
 * @route   GET /api/triangular/opportunities
 * @desc    Get active triangular arbitrage opportunities
 * @access  Public
 */
export async function getTriangularOpportunities(req, res) {
  try {
    const limit = parseInt(req.query.limit) || 20;

    const opportunities = await getActiveTriangularOpportunities(limit);

    res.status(200).json({
      success: true,
      count: opportunities.length,
      data: opportunities,
    });
  } catch (error) {
    console.error('Get triangular opportunities error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get triangular opportunities',
    });
  }
}

/**
 * @route   GET /api/triangular/stats
 * @desc    Get triangular arbitrage statistics
 * @access  Public
 */
export async function getTriangularStatistics(req, res) {
  try {
    const days = parseInt(req.query.days) || 7;

    const stats = await getTriangularStats(days);

    res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('Get triangular stats error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get triangular statistics',
    });
  }
}

/**
 * @route   DELETE /api/triangular/cleanup
 * @desc    Cleanup old triangular opportunities
 * @access  Admin only
 */
export async function cleanupTriangularOpportunities(req, res) {
  try {
    const days = parseInt(req.query.days) || 7;

    const deletedCount = await cleanupOldTriangular(days);

    res.status(200).json({
      success: true,
      message: `Deleted ${deletedCount} old triangular opportunities`,
      deletedCount,
    });
  } catch (error) {
    console.error('Cleanup triangular opportunities error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to cleanup triangular opportunities',
    });
  }
}

/**
 * @route   POST /api/triangular/mark-expired
 * @desc    Mark expired triangular opportunities
 * @access  Admin only
 */
export async function markExpiredTriangularOpportunities(req, res) {
  try {
    const expiredCount = await markExpiredTriangular();

    res.status(200).json({
      success: true,
      message: `Marked ${expiredCount} triangular opportunities as expired`,
      expiredCount,
    });
  } catch (error) {
    console.error('Mark expired triangular error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to mark expired triangular opportunities',
    });
  }
}
