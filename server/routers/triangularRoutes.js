import express from 'express';
import {
  scanTriangularOpportunities,
  getTriangularOpportunities,
  getTriangularStatistics,
  cleanupTriangularOpportunities,
  markExpiredTriangularOpportunities,
} from '../controllers/triangularController.js';
import { authenticateToken, requireAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

/**
 * Public routes
 */

// GET /api/triangular/opportunities - Get active triangular opportunities
router.get('/opportunities', getTriangularOpportunities);

// GET /api/triangular/stats - Get triangular statistics
router.get('/stats', getTriangularStatistics);

/**
 * Admin-only routes
 */

// GET /api/triangular/scan - Trigger manual scan (admin only)
router.get('/scan', authenticateToken, requireAdmin, scanTriangularOpportunities);

// POST /api/triangular/mark-expired - Mark expired opportunities
router.post('/mark-expired', authenticateToken, requireAdmin, markExpiredTriangularOpportunities);

// DELETE /api/triangular/cleanup - Cleanup old opportunities
router.delete('/cleanup', authenticateToken, requireAdmin, cleanupTriangularOpportunities);

export default router;
