import express from 'express';
import {
  scanOpportunities,
  getOpportunities,
  getHistory,
  getStats,
  getOpportunityById,
  cleanupExpired,
} from '../controllers/arbitrageController.js';
import { authenticateToken, requireAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public routes (or require auth based on your preference)
router.get('/opportunities', getOpportunities); // Get active opportunities
router.get('/history', getHistory); // Get opportunity history
router.get('/stats', getStats); // Get statistics
router.get('/opportunity/:id', getOpportunityById); // Get single opportunity

// Admin routes
router.get('/scan', authenticateToken, requireAdmin, scanOpportunities); // Trigger manual scan
router.delete('/cleanup', authenticateToken, requireAdmin, cleanupExpired); // Cleanup old opportunities

export default router;
