/**
 * AI API Routes
 * Endpoints for AI-powered trading insights
 */

import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import pool from '../db.js';
import { analyzePatterns } from '../services/patternRecognition.js';
import { analyzeSentiment } from '../services/sentimentAnalysis.js';
import { generateRecommendations } from '../services/recommendations.js';
import { predictOutcome, getModelStats } from '../services/tradePrediction.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

/**
 * Helper function to get user's trades
 */
async function getUserTrades(userId) {
  const result = await pool.query(
    `SELECT t.*, s.name as strategy_name
     FROM trades t
     LEFT JOIN strategies s ON t.strategy_id = s.id
     WHERE t.user_id = $1
     ORDER BY t.date DESC`,
    [userId]
  );
  return result.rows;
}

/**
 * Helper function to get or create cached insight
 */
async function getCachedInsight(userId, insightType, maxAgeMinutes = 60) {
  const result = await pool.query(
    `SELECT data, computed_at 
     FROM ai_insights_cache 
     WHERE user_id = $1 AND insight_type = $2 
       AND computed_at > NOW() - INTERVAL '${maxAgeMinutes} minutes'`,
    [userId, insightType]
  );
  return result.rows[0] || null;
}

/**
 * Helper function to cache insight
 */
async function cacheInsight(userId, insightType, data) {
  await pool.query(
    `INSERT INTO ai_insights_cache (user_id, insight_type, data, computed_at, expires_at)
     VALUES ($1, $2, $3, NOW(), NOW() + INTERVAL '1 hour')
     ON CONFLICT (user_id, insight_type) 
     DO UPDATE SET data = $3, computed_at = NOW(), expires_at = NOW() + INTERVAL '1 hour'`,
    [userId, insightType, JSON.stringify(data)]
  );
}

/**
 * GET /api/ai/patterns
 * Get trading patterns analysis
 */
router.get('/patterns', async (req, res) => {
  try {
    const userId = req.user.id;
    const forceRefresh = req.query.refresh === 'true';
    
    // Check cache first
    if (!forceRefresh) {
      const cached = await getCachedInsight(userId, 'patterns');
      if (cached) {
        return res.json({
          success: true,
          cached: true,
          computedAt: cached.computed_at,
          data: cached.data
        });
      }
    }
    
    // Get trades and analyze
    const trades = await getUserTrades(userId);
    const analysis = analyzePatterns(trades);
    
    if (analysis.success) {
      await cacheInsight(userId, 'patterns', analysis.data);
    }
    
    res.json({
      ...analysis,
      cached: false
    });
  } catch (error) {
    console.error('Pattern analysis error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to analyze patterns'
    });
  }
});

/**
 * GET /api/ai/sentiment
 * Get sentiment analysis of trading notes
 */
router.get('/sentiment', async (req, res) => {
  try {
    const userId = req.user.id;
    const forceRefresh = req.query.refresh === 'true';
    
    // Check cache first
    if (!forceRefresh) {
      const cached = await getCachedInsight(userId, 'sentiment');
      if (cached) {
        return res.json({
          success: true,
          cached: true,
          computedAt: cached.computed_at,
          data: cached.data
        });
      }
    }
    
    // Get trades and analyze
    const trades = await getUserTrades(userId);
    const analysis = analyzeSentiment(trades);
    
    if (analysis.success) {
      await cacheInsight(userId, 'sentiment', analysis.data);
    }
    
    res.json({
      ...analysis,
      cached: false
    });
  } catch (error) {
    console.error('Sentiment analysis error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to analyze sentiment'
    });
  }
});

/**
 * GET /api/ai/recommendations
 * Get personalized trading recommendations
 */
router.get('/recommendations', async (req, res) => {
  try {
    const userId = req.user.id;
    const forceRefresh = req.query.refresh === 'true';
    
    // Check cache first
    if (!forceRefresh) {
      const cached = await getCachedInsight(userId, 'recommendations');
      if (cached) {
        return res.json({
          success: true,
          cached: true,
          computedAt: cached.computed_at,
          data: cached.data
        });
      }
    }
    
    // Get trades
    const trades = await getUserTrades(userId);
    
    // Run pattern and sentiment analysis
    const patternAnalysis = analyzePatterns(trades);
    const sentimentAnalysis = analyzeSentiment(trades);
    
    // Generate recommendations
    const recommendations = generateRecommendations(patternAnalysis, sentimentAnalysis);
    
    if (recommendations.success) {
      await cacheInsight(userId, 'recommendations', recommendations.data);
    }
    
    res.json({
      ...recommendations,
      cached: false
    });
  } catch (error) {
    console.error('Recommendations error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate recommendations'
    });
  }
});

/**
 * POST /api/ai/predict
 * Predict outcome for a potential trade
 */
router.post('/predict', async (req, res) => {
  try {
    const userId = req.user.id;
    const newTrade = req.body;
    
    // Validate required fields
    if (!newTrade.session || !newTrade.trade_type) {
      return res.status(400).json({
        success: false,
        message: 'Session and trade_type are required for prediction'
      });
    }
    
    // Get historical trades
    const trades = await getUserTrades(userId);
    
    // Make prediction
    const prediction = predictOutcome(newTrade, trades);
    
    res.json(prediction);
  } catch (error) {
    console.error('Prediction error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to make prediction'
    });
  }
});

/**
 * GET /api/ai/model-stats
 * Get prediction model statistics
 */
router.get('/model-stats', async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get trades
    const trades = await getUserTrades(userId);
    
    // Get model stats
    const stats = getModelStats(trades);
    
    res.json(stats);
  } catch (error) {
    console.error('Model stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get model statistics'
    });
  }
});

/**
 * GET /api/ai/insights
 * Get all AI insights combined
 */
router.get('/insights', async (req, res) => {
  try {
    const userId = req.user.id;
    const forceRefresh = req.query.refresh === 'true';
    
    // Get trades
    const trades = await getUserTrades(userId);
    
    // Run all analyses
    let patternAnalysis, sentimentAnalysis, recommendations, modelStats;
    
    // Check cache for patterns
    if (!forceRefresh) {
      const cachedPatterns = await getCachedInsight(userId, 'patterns');
      if (cachedPatterns) {
        patternAnalysis = { success: true, data: cachedPatterns.data, cached: true };
      }
    }
    if (!patternAnalysis) {
      patternAnalysis = analyzePatterns(trades);
      if (patternAnalysis.success) {
        await cacheInsight(userId, 'patterns', patternAnalysis.data);
      }
    }
    
    // Check cache for sentiment
    if (!forceRefresh) {
      const cachedSentiment = await getCachedInsight(userId, 'sentiment');
      if (cachedSentiment) {
        sentimentAnalysis = { success: true, data: cachedSentiment.data, cached: true };
      }
    }
    if (!sentimentAnalysis) {
      sentimentAnalysis = analyzeSentiment(trades);
      if (sentimentAnalysis.success) {
        await cacheInsight(userId, 'sentiment', sentimentAnalysis.data);
      }
    }
    
    // Generate recommendations (always fresh based on analyses)
    recommendations = generateRecommendations(patternAnalysis, sentimentAnalysis);
    if (recommendations.success) {
      await cacheInsight(userId, 'recommendations', recommendations.data);
    }
    
    // Get model stats
    modelStats = getModelStats(trades);
    
    res.json({
      success: true,
      data: {
        patterns: patternAnalysis.success ? patternAnalysis.data : null,
        sentiment: sentimentAnalysis.success ? sentimentAnalysis.data : null,
        recommendations: recommendations.success ? recommendations.data : null,
        modelStats: modelStats.success ? modelStats.data : null,
        tradesAnalyzed: trades.length
      }
    });
  } catch (error) {
    console.error('Combined insights error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get AI insights'
    });
  }
});

/**
 * DELETE /api/ai/cache
 * Clear cached insights for user
 */
router.delete('/cache', async (req, res) => {
  try {
    const userId = req.user.id;
    
    await pool.query(
      'DELETE FROM ai_insights_cache WHERE user_id = $1',
      [userId]
    );
    
    res.json({
      success: true,
      message: 'Cache cleared successfully'
    });
  } catch (error) {
    console.error('Cache clear error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clear cache'
    });
  }
});

export default router;
