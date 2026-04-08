/**
 * Pattern Recognition Service
 * Analyzes trading patterns to identify winning and losing patterns
 */

const DAYS_OF_WEEK = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const SESSIONS = ['asia', 'london', 'newyork', 'newyork_pm'];
const MIN_TRADES_FOR_PATTERN = 3;

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
  const fees = parseFloat(trade.fees || 0);
  
  let pnl;
  if (trade.trade_type === 'long') {
    pnl = (exit - entry) * size;
  } else {
    pnl = (entry - exit) * size;
  }
  
  return pnl - fees;
}

/**
 * Get day of week from date
 */
function getDayOfWeek(dateStr) {
  const date = new Date(dateStr);
  return DAYS_OF_WEEK[date.getDay()];
}

/**
 * Calculate statistics for a group of trades
 */
function calculateStats(trades) {
  if (!trades || trades.length === 0) {
    return null;
  }
  
  let wins = 0;
  let losses = 0;
  let totalPnl = 0;
  let winPnl = 0;
  let lossPnl = 0;
  
  trades.forEach(trade => {
    const pnl = calculatePnl(trade);
    totalPnl += pnl;
    
    if (pnl > 0) {
      wins++;
      winPnl += pnl;
    } else if (pnl < 0) {
      losses++;
      lossPnl += pnl;
    }
  });
  
  const totalTrades = trades.length;
  const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;
  const avgPnl = totalTrades > 0 ? totalPnl / totalTrades : 0;
  const avgWin = wins > 0 ? winPnl / wins : 0;
  const avgLoss = losses > 0 ? lossPnl / losses : 0;
  
  return {
    totalTrades,
    wins,
    losses,
    winRate: parseFloat(winRate.toFixed(2)),
    totalPnl: parseFloat(totalPnl.toFixed(2)),
    avgPnl: parseFloat(avgPnl.toFixed(2)),
    avgWin: parseFloat(avgWin.toFixed(2)),
    avgLoss: parseFloat(avgLoss.toFixed(2)),
    profitFactor: Math.abs(lossPnl) > 0 ? parseFloat((winPnl / Math.abs(lossPnl)).toFixed(2)) : winPnl > 0 ? Infinity : 0
  };
}

/**
 * Group trades by a dimension and calculate stats
 */
function analyzeByDimension(trades, getDimensionValue) {
  const groups = {};
  
  trades.forEach(trade => {
    const value = getDimensionValue(trade);
    if (value) {
      if (!groups[value]) {
        groups[value] = [];
      }
      groups[value].push(trade);
    }
  });
  
  const results = {};
  Object.entries(groups).forEach(([key, groupTrades]) => {
    const stats = calculateStats(groupTrades);
    if (stats && stats.totalTrades >= MIN_TRADES_FOR_PATTERN) {
      results[key] = stats;
    }
  });
  
  return results;
}

/**
 * Analyze multi-dimensional patterns
 */
function analyzePatternCombinations(trades) {
  const patterns = {};
  
  trades.forEach(trade => {
    const session = trade.session || 'unknown';
    const tradeType = trade.trade_type || 'unknown';
    const assetClass = trade.asset_class || 'unknown';
    const dayOfWeek = getDayOfWeek(trade.date);
    const confidence = trade.confidence_level || 'unknown';
    
    // 2-dimension patterns
    const keys = [
      `${session}_${tradeType}`,
      `${session}_${assetClass}`,
      `${tradeType}_${assetClass}`,
      `${dayOfWeek}_${tradeType}`,
      `${dayOfWeek}_${session}`,
      `${confidence}_${tradeType}`,
      `${confidence}_${session}`,
    ];
    
    // 3-dimension patterns
    keys.push(`${session}_${tradeType}_${assetClass}`);
    keys.push(`${dayOfWeek}_${session}_${tradeType}`);
    keys.push(`${confidence}_${session}_${tradeType}`);
    
    keys.forEach(key => {
      if (!patterns[key]) {
        patterns[key] = [];
      }
      patterns[key].push(trade);
    });
  });
  
  const results = [];
  Object.entries(patterns).forEach(([key, groupTrades]) => {
    const stats = calculateStats(groupTrades);
    if (stats && stats.totalTrades >= MIN_TRADES_FOR_PATTERN) {
      const dimensions = key.split('_');
      results.push({
        pattern: key,
        dimensions,
        label: dimensions.map(d => d.charAt(0).toUpperCase() + d.slice(1)).join(' + '),
        ...stats
      });
    }
  });
  
  return results;
}

/**
 * Analyze trading streaks
 */
function analyzeStreaks(trades) {
  // Sort trades by date
  const sortedTrades = [...trades].sort((a, b) => new Date(a.date) - new Date(b.date));
  
  const afterWin = [];
  const afterLoss = [];
  const after2Wins = [];
  const after2Losses = [];
  const after3Losses = [];
  
  for (let i = 1; i < sortedTrades.length; i++) {
    const prevTrade = sortedTrades[i - 1];
    const currentTrade = sortedTrades[i];
    const prevPnl = calculatePnl(prevTrade);
    
    if (prevPnl > 0) {
      afterWin.push(currentTrade);
    } else if (prevPnl < 0) {
      afterLoss.push(currentTrade);
    }
    
    if (i >= 2) {
      const prev2Trade = sortedTrades[i - 2];
      const prev2Pnl = calculatePnl(prev2Trade);
      
      if (prevPnl > 0 && prev2Pnl > 0) {
        after2Wins.push(currentTrade);
      }
      if (prevPnl < 0 && prev2Pnl < 0) {
        after2Losses.push(currentTrade);
      }
    }
    
    if (i >= 3) {
      const prev3Trade = sortedTrades[i - 3];
      const prev3Pnl = calculatePnl(prev3Trade);
      const prev2Trade = sortedTrades[i - 2];
      const prev2Pnl = calculatePnl(prev2Trade);
      
      if (prevPnl < 0 && prev2Pnl < 0 && prev3Pnl < 0) {
        after3Losses.push(currentTrade);
      }
    }
  }
  
  return {
    afterWin: calculateStats(afterWin),
    afterLoss: calculateStats(afterLoss),
    after2Wins: calculateStats(after2Wins),
    after2Losses: calculateStats(after2Losses),
    after3Losses: calculateStats(after3Losses)
  };
}

/**
 * Calculate overall pattern score (0-100)
 */
function calculatePatternScore(analysis) {
  let score = 50; // Base score
  
  // Adjust based on overall win rate
  if (analysis.overall) {
    const winRate = analysis.overall.winRate;
    score += (winRate - 50) * 0.5; // +/- 25 points based on win rate
  }
  
  // Bonus for having strong winning patterns
  if (analysis.winningPatterns && analysis.winningPatterns.length > 0) {
    const topPattern = analysis.winningPatterns[0];
    if (topPattern.winRate > 70) score += 10;
    if (topPattern.winRate > 80) score += 5;
  }
  
  // Penalty for bad streak performance
  if (analysis.streakAnalysis?.after2Losses?.winRate < 30) {
    score -= 10;
  }
  
  // Ensure score is within bounds
  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Main function to analyze trading patterns
 */
export function analyzePatterns(trades) {
  if (!trades || trades.length === 0) {
    return {
      success: false,
      message: 'No trades available for analysis',
      data: null
    };
  }
  
  // Filter to closed/reviewed trades only
  const closedTrades = trades.filter(t => t.status === 'closed' || t.status === 'reviewed');
  
  if (closedTrades.length < MIN_TRADES_FOR_PATTERN) {
    return {
      success: false,
      message: `Need at least ${MIN_TRADES_FOR_PATTERN} closed trades for pattern analysis`,
      data: null
    };
  }
  
  // Overall statistics
  const overall = calculateStats(closedTrades);
  
  // Analysis by single dimensions
  const sessionAnalysis = analyzeByDimension(closedTrades, t => t.session);
  const dayOfWeekAnalysis = analyzeByDimension(closedTrades, t => getDayOfWeek(t.date));
  const assetClassAnalysis = analyzeByDimension(closedTrades, t => t.asset_class);
  const tradeTypeAnalysis = analyzeByDimension(closedTrades, t => t.trade_type);
  const confidenceAnalysis = analyzeByDimension(closedTrades, t => t.confidence_level);
  const strategyAnalysis = analyzeByDimension(closedTrades, t => t.strategy_name || t.strategy_id);
  
  // Multi-dimensional pattern analysis
  const allPatterns = analyzePatternCombinations(closedTrades);
  
  // Sort patterns by win rate
  const sortedByWinRate = [...allPatterns].sort((a, b) => b.winRate - a.winRate);
  const winningPatterns = sortedByWinRate.filter(p => p.winRate >= 55).slice(0, 10);
  const losingPatterns = sortedByWinRate.filter(p => p.winRate <= 45).reverse().slice(0, 10);
  
  // Sort by profitability
  const sortedByPnl = [...allPatterns].sort((a, b) => b.avgPnl - a.avgPnl);
  const mostProfitable = sortedByPnl.slice(0, 5);
  const leastProfitable = sortedByPnl.slice(-5).reverse();
  
  // Streak analysis
  const streakAnalysis = analyzeStreaks(closedTrades);
  
  const analysis = {
    overall,
    sessionAnalysis,
    dayOfWeekAnalysis,
    assetClassAnalysis,
    tradeTypeAnalysis,
    confidenceAnalysis,
    strategyAnalysis,
    winningPatterns,
    losingPatterns,
    mostProfitable,
    leastProfitable,
    streakAnalysis,
    totalTradesAnalyzed: closedTrades.length
  };
  
  // Calculate pattern score
  const patternScore = calculatePatternScore(analysis);
  
  return {
    success: true,
    data: {
      ...analysis,
      patternScore
    }
  };
}

export default {
  analyzePatterns,
  calculateStats,
  calculatePnl
};
