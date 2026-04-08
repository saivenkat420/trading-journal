/**
 * Trade Prediction Service
 * Uses logistic regression to predict trade outcomes based on historical data
 */

import LogisticRegression from 'ml-logistic-regression';
import { Matrix } from 'ml-matrix';

const SESSIONS = ['asia', 'london', 'newyork', 'newyork_pm'];
const DAYS_OF_WEEK = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const ASSET_CLASSES = ['forex', 'futures', 'stocks', 'crypto', 'options', 'other'];
const CONFIDENCE_LEVELS = ['bad', 'average', 'good'];
const TRADE_TYPES = ['long', 'short'];

const MIN_TRADES_FOR_TRAINING = 15;

/**
 * Calculate P&L for a trade
 */
function calculatePnl(trade) {
  if (trade.total_pnl !== undefined && trade.total_pnl !== null) {
    return parseFloat(trade.total_pnl);
  }
  if (trade.realized_pnl !== undefined && trade.realized_pnl !== null) {
    return parseFloat(trade.realized_pnl);
  }
  if (!trade.entry_price || !trade.exit_price) {
    return 0;
  }
  const entry = parseFloat(trade.entry_price);
  const exit = parseFloat(trade.exit_price);
  const size = parseFloat(trade.position_size);
  const pnl = trade.trade_type === 'long' ? (exit - entry) * size : (entry - exit) * size;
  return pnl - parseFloat(trade.fees || 0);
}

/**
 * One-hot encode a categorical value
 */
function oneHotEncode(value, categories) {
  const encoded = new Array(categories.length).fill(0);
  const index = categories.indexOf(value?.toLowerCase());
  if (index !== -1) {
    encoded[index] = 1;
  }
  return encoded;
}

/**
 * Calculate recent streak
 */
function calculateStreak(trades, tradeDate, isWinStreak) {
  const sortedTrades = [...trades]
    .filter(t => new Date(t.date) < new Date(tradeDate))
    .sort((a, b) => new Date(b.date) - new Date(a.date));
  
  let streak = 0;
  for (const trade of sortedTrades) {
    const pnl = calculatePnl(trade);
    if (isWinStreak && pnl > 0) {
      streak++;
    } else if (!isWinStreak && pnl < 0) {
      streak++;
    } else {
      break;
    }
    if (streak >= 5) break;
  }
  return Math.min(streak, 5);
}

/**
 * Extract features from a trade
 */
function extractFeatures(trade, allTrades = []) {
  const features = [];
  
  // Session (one-hot encoded)
  features.push(...oneHotEncode(trade.session, SESSIONS));
  
  // Day of week (one-hot encoded)
  const dayOfWeek = new Date(trade.date).getDay();
  features.push(...oneHotEncode(DAYS_OF_WEEK[dayOfWeek], DAYS_OF_WEEK));
  
  // Trade type (binary: 0 = short, 1 = long)
  features.push(trade.trade_type?.toLowerCase() === 'long' ? 1 : 0);
  
  // Asset class (one-hot encoded)
  features.push(...oneHotEncode(trade.asset_class, ASSET_CLASSES));
  
  // Confidence level (ordinal: bad=0, average=1, good=2)
  const confidenceIndex = CONFIDENCE_LEVELS.indexOf(trade.confidence_level?.toLowerCase());
  features.push(confidenceIndex !== -1 ? confidenceIndex : 1);
  
  // Recent win streak (0-5)
  const winStreak = calculateStreak(allTrades, trade.date, true);
  features.push(winStreak);
  
  // Recent loss streak (0-5)
  const lossStreak = calculateStreak(allTrades, trade.date, false);
  features.push(lossStreak);
  
  return features;
}

/**
 * Get feature names for explanation
 */
function getFeatureNames() {
  return [
    ...SESSIONS.map(s => `session_${s}`),
    ...DAYS_OF_WEEK.map(d => `day_${d}`),
    'trade_type_long',
    ...ASSET_CLASSES.map(a => `asset_${a}`),
    'confidence_level',
    'win_streak',
    'loss_streak'
  ];
}

/**
 * Train the prediction model
 */
function trainModel(trades) {
  const closedTrades = trades.filter(t => t.status === 'closed' || t.status === 'reviewed');
  
  if (closedTrades.length < MIN_TRADES_FOR_TRAINING) {
    return {
      success: false,
      message: `Need at least ${MIN_TRADES_FOR_TRAINING} closed trades for prediction model`,
      model: null
    };
  }
  
  // Prepare training data
  const X = [];
  const y = [];
  
  closedTrades.forEach(trade => {
    const features = extractFeatures(trade, closedTrades);
    const pnl = calculatePnl(trade);
    const label = pnl > 0 ? 1 : 0;
    
    X.push(features);
    y.push(label);
  });
  
  try {
    // Create and train logistic regression model
    const logreg = new LogisticRegression({
      numSteps: 1000,
      learningRate: 0.1
    });
    
    const XMatrix = new Matrix(X);
    logreg.train(XMatrix, Matrix.columnVector(y));
    
    // Calculate training accuracy
    const predictions = logreg.predict(XMatrix);
    let correct = 0;
    for (let i = 0; i < y.length; i++) {
      if (predictions.get(i, 0) === y[i]) {
        correct++;
      }
    }
    const accuracy = (correct / y.length) * 100;
    
    return {
      success: true,
      model: logreg,
      accuracy: parseFloat(accuracy.toFixed(2)),
      trainedOn: closedTrades.length,
      featureCount: X[0].length
    };
  } catch (error) {
    console.error('Error training model:', error);
    return {
      success: false,
      message: 'Error training prediction model',
      model: null
    };
  }
}

/**
 * Calculate feature impacts for explanation
 */
function calculateFeatureImpacts(features, featureNames, model, baseProbability) {
  const impacts = [];
  const weights = model.classifiers?.[0]?.weights || [];
  
  // Find significant features
  for (let i = 0; i < features.length; i++) {
    if (features[i] !== 0 && weights[i]) {
      const impact = features[i] * weights[i] * 0.1;
      
      if (Math.abs(impact) > 0.02) {
        const name = featureNames[i]
          .replace('session_', '')
          .replace('day_', '')
          .replace('asset_', '')
          .replace('trade_type_', '')
          .replace(/_/g, ' ');
        
        impacts.push({
          name: name.charAt(0).toUpperCase() + name.slice(1),
          impact: parseFloat(impact.toFixed(3)),
          direction: impact > 0 ? 'positive' : 'negative'
        });
      }
    }
  }
  
  // Add confidence level interpretation
  const confIndex = featureNames.indexOf('confidence_level');
  if (confIndex !== -1 && features[confIndex] !== 1) {
    const confLabels = ['Low confidence', 'Average confidence', 'High confidence'];
    const impact = (features[confIndex] - 1) * 0.1;
    if (Math.abs(impact) > 0.02) {
      impacts.push({
        name: confLabels[features[confIndex]],
        impact: parseFloat(impact.toFixed(3)),
        direction: impact > 0 ? 'positive' : 'negative'
      });
    }
  }
  
  // Sort by absolute impact
  impacts.sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact));
  
  return impacts.slice(0, 5);
}

/**
 * Find similar historical trades
 */
function findSimilarTrades(trade, historicalTrades) {
  const similar = historicalTrades.filter(t => {
    if (t.status !== 'closed' && t.status !== 'reviewed') return false;
    
    let matches = 0;
    if (t.session === trade.session) matches++;
    if (t.trade_type === trade.trade_type) matches++;
    if (t.asset_class === trade.asset_class) matches++;
    if (t.confidence_level === trade.confidence_level) matches++;
    
    const tradeDay = new Date(trade.date).getDay();
    const tDay = new Date(t.date).getDay();
    if (tradeDay === tDay) matches++;
    
    return matches >= 3;
  });
  
  let wins = 0;
  let losses = 0;
  let totalPnl = 0;
  
  similar.forEach(t => {
    const pnl = calculatePnl(t);
    totalPnl += pnl;
    if (pnl > 0) wins++;
    else losses++;
  });
  
  return {
    total: similar.length,
    wins,
    losses,
    winRate: similar.length > 0 ? parseFloat(((wins / similar.length) * 100).toFixed(1)) : 0,
    avgPnl: similar.length > 0 ? parseFloat((totalPnl / similar.length).toFixed(2)) : 0
  };
}

/**
 * Make a prediction for a new trade
 */
export function predictOutcome(newTrade, historicalTrades) {
  if (!historicalTrades || historicalTrades.length < MIN_TRADES_FOR_TRAINING) {
    return {
      success: false,
      message: `Need at least ${MIN_TRADES_FOR_TRAINING} historical trades for prediction`,
      data: null
    };
  }
  
  // Train model on historical data
  const training = trainModel(historicalTrades);
  
  if (!training.success) {
    return {
      success: false,
      message: training.message,
      data: null
    };
  }
  
  try {
    // Extract features for new trade
    const features = extractFeatures(newTrade, historicalTrades);
    const featureNames = getFeatureNames();
    
    // Make prediction
    const XNew = new Matrix([features]);
    const prediction = training.model.predict(XNew);
    const probabilities = training.model.classifiers?.[0]?.testExamples?.(XNew);
    
    // Calculate win probability
    let winProbability = 0.5;
    if (probabilities && probabilities.length > 0) {
      winProbability = probabilities[0];
    } else {
      winProbability = prediction.get(0, 0) === 1 ? 0.65 : 0.35;
    }
    
    // Ensure probability is in valid range
    winProbability = Math.max(0.1, Math.min(0.9, winProbability));
    
    // Determine confidence level
    let confidenceLevel = 'medium';
    if (Math.abs(winProbability - 0.5) > 0.25) {
      confidenceLevel = 'high';
    } else if (Math.abs(winProbability - 0.5) < 0.1) {
      confidenceLevel = 'low';
    }
    
    // Determine risk level
    let riskLevel = 'medium';
    if (winProbability < 0.35) {
      riskLevel = 'high';
    } else if (winProbability > 0.65) {
      riskLevel = 'low';
    }
    
    // Calculate feature impacts
    const factors = calculateFeatureImpacts(features, featureNames, training.model, winProbability);
    
    // Find similar trades
    const similarTrades = findSimilarTrades(newTrade, historicalTrades);
    
    return {
      success: true,
      data: {
        winProbability: parseFloat(winProbability.toFixed(2)),
        confidenceLevel,
        riskLevel,
        factors,
        similarTrades,
        modelAccuracy: training.accuracy,
        trainedOnTrades: training.trainedOn
      }
    };
  } catch (error) {
    console.error('Error making prediction:', error);
    return {
      success: false,
      message: 'Error making prediction',
      data: null
    };
  }
}

/**
 * Get model statistics
 */
export function getModelStats(trades) {
  const training = trainModel(trades);
  
  if (!training.success) {
    return {
      success: false,
      message: training.message,
      data: null
    };
  }
  
  return {
    success: true,
    data: {
      accuracy: training.accuracy,
      trainedOn: training.trainedOn,
      featureCount: training.featureCount,
      ready: true
    }
  };
}

export default {
  predictOutcome,
  getModelStats,
  trainModel
};
