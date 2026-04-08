/**
 * Sentiment Analysis Service
 * Analyzes trading notes and reflections for emotional patterns
 */

import Sentiment from 'sentiment';

const sentiment = new Sentiment();

// Custom trading-specific lexicon
const tradingLexicon = {
  // Overconfidence indicators (negative for trading outcomes)
  'guaranteed': -3,
  'certain': -2,
  'certainty': -2,
  'easy': -2,
  'easy money': -4,
  'cant lose': -4,
  "can't lose": -4,
  'no way to lose': -4,
  'sure thing': -3,
  'obvious': -2,
  'definitely': -2,
  'absolutely': -2,
  '100%': -3,
  'slam dunk': -3,
  'no brainer': -3,
  
  // FOMO indicators (negative)
  'missing out': -3,
  'fomo': -3,
  'have to': -2,
  'must enter': -2,
  'everyone is': -2,
  'late to': -2,
  'chasing': -3,
  'revenge': -4,
  'revenge trade': -5,
  'get back': -2,
  'make up': -2,
  
  // Fear indicators (context dependent - slightly negative)
  'scared': -1,
  'afraid': -1,
  'worried': -1,
  'nervous': -1,
  'anxious': -1,
  'risky': 0,
  'uncertain': 0,
  'hesitant': 0,
  
  // Discipline indicators (positive for trading)
  'plan': 2,
  'planned': 2,
  'setup': 2,
  'confirmed': 2,
  'confirmation': 2,
  'rules': 2,
  'followed rules': 3,
  'strategy': 2,
  'patient': 3,
  'patience': 3,
  'waited': 2,
  'disciplined': 3,
  'discipline': 3,
  'systematic': 2,
  'according to plan': 4,
  'as planned': 3,
  
  // Risk management (positive)
  'stop loss': 2,
  'risk management': 3,
  'position size': 2,
  'risk reward': 2,
  'r:r': 2,
  'proper size': 2,
  'small size': 1,
  
  // Emotional trading (negative)
  'emotional': -2,
  'angry': -3,
  'frustrated': -2,
  'greedy': -3,
  'greed': -3,
  'impatient': -2,
  'bored': -2,
  'excited': -1,
  'euphoric': -2,
  'tilted': -3,
  'tilt': -3,
  
  // Learning indicators (neutral to positive)
  'learned': 2,
  'lesson': 1,
  'mistake': 0,
  'improve': 2,
  'better': 1,
  'next time': 1
};

// Register custom lexicon
sentiment.registerLanguage('trading', {
  labels: tradingLexicon
});

/**
 * Emotion categories and their keywords
 */
const emotionCategories = {
  overconfidence: ['guaranteed', 'certain', 'easy', 'obvious', 'definitely', 'sure', '100%', 'cant lose', "can't lose", 'no brainer', 'slam dunk'],
  fear: ['scared', 'afraid', 'worried', 'nervous', 'anxious', 'uncertain', 'hesitant', 'risky'],
  fomo: ['missing out', 'fomo', 'have to', 'must', 'chasing', 'late', 'everyone'],
  discipline: ['plan', 'setup', 'confirmed', 'rules', 'strategy', 'patient', 'waited', 'disciplined', 'systematic'],
  greed: ['greedy', 'greed', 'more', 'double', 'triple', 'all in'],
  revenge: ['revenge', 'get back', 'make up', 'angry', 'frustrated']
};

/**
 * Detect emotions in text
 */
function detectEmotions(text) {
  if (!text) return { dominant: 'neutral', scores: {} };
  
  const lowerText = text.toLowerCase();
  const scores = {};
  
  Object.entries(emotionCategories).forEach(([emotion, keywords]) => {
    let count = 0;
    keywords.forEach(keyword => {
      const regex = new RegExp(keyword, 'gi');
      const matches = lowerText.match(regex);
      if (matches) {
        count += matches.length;
      }
    });
    scores[emotion] = count;
  });
  
  // Find dominant emotion
  let dominant = 'neutral';
  let maxScore = 0;
  Object.entries(scores).forEach(([emotion, score]) => {
    if (score > maxScore) {
      maxScore = score;
      dominant = emotion;
    }
  });
  
  return { dominant: maxScore > 0 ? dominant : 'neutral', scores };
}

/**
 * Analyze a single trade's notes
 */
function analyzeTradeNotes(trade) {
  const notesText = trade.notes || '';
  const reflectionText = trade.reflection || '';
  const combinedText = `${notesText} ${reflectionText}`;
  
  if (!combinedText.trim()) {
    return {
      hasNotes: false,
      sentiment: { score: 0, comparative: 0, label: 'neutral' },
      emotions: { dominant: 'neutral', scores: {} }
    };
  }
  
  // Analyze sentiment with trading lexicon
  const result = sentiment.analyze(combinedText, { language: 'trading' });
  
  // Determine sentiment label
  let label = 'neutral';
  if (result.comparative > 0.1) label = 'positive';
  else if (result.comparative > 0.3) label = 'very_positive';
  else if (result.comparative < -0.1) label = 'negative';
  else if (result.comparative < -0.3) label = 'very_negative';
  
  // Detect specific emotions
  const emotions = detectEmotions(combinedText);
  
  return {
    hasNotes: true,
    sentiment: {
      score: result.score,
      comparative: parseFloat(result.comparative.toFixed(3)),
      label,
      positive: result.positive,
      negative: result.negative
    },
    emotions
  };
}

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
 * Correlate sentiment with trade outcomes
 */
function correlateSentimentWithOutcomes(tradesWithSentiment) {
  const correlations = {
    positive: { trades: [], wins: 0, losses: 0, totalPnl: 0 },
    negative: { trades: [], wins: 0, losses: 0, totalPnl: 0 },
    neutral: { trades: [], wins: 0, losses: 0, totalPnl: 0 },
    overconfident: { trades: [], wins: 0, losses: 0, totalPnl: 0 },
    disciplined: { trades: [], wins: 0, losses: 0, totalPnl: 0 },
    fearful: { trades: [], wins: 0, losses: 0, totalPnl: 0 },
    fomo: { trades: [], wins: 0, losses: 0, totalPnl: 0 },
    revenge: { trades: [], wins: 0, losses: 0, totalPnl: 0 }
  };
  
  tradesWithSentiment.forEach(({ trade, analysis }) => {
    if (!analysis.hasNotes) return;
    
    const pnl = calculatePnl(trade);
    const isWin = pnl > 0;
    
    // By sentiment
    const sentimentLabel = analysis.sentiment.label;
    if (sentimentLabel.includes('positive')) {
      correlations.positive.trades.push(trade);
      correlations.positive.totalPnl += pnl;
      if (isWin) correlations.positive.wins++;
      else correlations.positive.losses++;
    } else if (sentimentLabel.includes('negative')) {
      correlations.negative.trades.push(trade);
      correlations.negative.totalPnl += pnl;
      if (isWin) correlations.negative.wins++;
      else correlations.negative.losses++;
    } else {
      correlations.neutral.trades.push(trade);
      correlations.neutral.totalPnl += pnl;
      if (isWin) correlations.neutral.wins++;
      else correlations.neutral.losses++;
    }
    
    // By dominant emotion
    const dominant = analysis.emotions.dominant;
    if (dominant === 'overconfidence') {
      correlations.overconfident.trades.push(trade);
      correlations.overconfident.totalPnl += pnl;
      if (isWin) correlations.overconfident.wins++;
      else correlations.overconfident.losses++;
    } else if (dominant === 'discipline') {
      correlations.disciplined.trades.push(trade);
      correlations.disciplined.totalPnl += pnl;
      if (isWin) correlations.disciplined.wins++;
      else correlations.disciplined.losses++;
    } else if (dominant === 'fear') {
      correlations.fearful.trades.push(trade);
      correlations.fearful.totalPnl += pnl;
      if (isWin) correlations.fearful.wins++;
      else correlations.fearful.losses++;
    } else if (dominant === 'fomo') {
      correlations.fomo.trades.push(trade);
      correlations.fomo.totalPnl += pnl;
      if (isWin) correlations.fomo.wins++;
      else correlations.fomo.losses++;
    } else if (dominant === 'revenge') {
      correlations.revenge.trades.push(trade);
      correlations.revenge.totalPnl += pnl;
      if (isWin) correlations.revenge.wins++;
      else correlations.revenge.losses++;
    }
  });
  
  // Calculate win rates
  const results = {};
  Object.entries(correlations).forEach(([key, data]) => {
    const total = data.wins + data.losses;
    results[key] = {
      count: total,
      wins: data.wins,
      losses: data.losses,
      winRate: total > 0 ? parseFloat(((data.wins / total) * 100).toFixed(2)) : 0,
      avgPnl: total > 0 ? parseFloat((data.totalPnl / total).toFixed(2)) : 0,
      totalPnl: parseFloat(data.totalPnl.toFixed(2))
    };
  });
  
  return results;
}

/**
 * Analyze sentiment trend over time
 */
function analyzeTrend(tradesWithSentiment) {
  if (tradesWithSentiment.length < 5) {
    return { trend: 'insufficient_data', change: 0 };
  }
  
  // Sort by date
  const sorted = [...tradesWithSentiment]
    .filter(t => t.analysis.hasNotes)
    .sort((a, b) => new Date(a.trade.date) - new Date(b.trade.date));
  
  if (sorted.length < 5) {
    return { trend: 'insufficient_data', change: 0 };
  }
  
  // Compare first half vs second half
  const midpoint = Math.floor(sorted.length / 2);
  const firstHalf = sorted.slice(0, midpoint);
  const secondHalf = sorted.slice(midpoint);
  
  const firstAvg = firstHalf.reduce((sum, t) => sum + t.analysis.sentiment.comparative, 0) / firstHalf.length;
  const secondAvg = secondHalf.reduce((sum, t) => sum + t.analysis.sentiment.comparative, 0) / secondHalf.length;
  
  const change = secondAvg - firstAvg;
  let trend = 'stable';
  if (change > 0.1) trend = 'improving';
  else if (change < -0.1) trend = 'declining';
  
  return {
    trend,
    change: parseFloat(change.toFixed(3)),
    firstHalfAvg: parseFloat(firstAvg.toFixed(3)),
    secondHalfAvg: parseFloat(secondAvg.toFixed(3))
  };
}

/**
 * Calculate emotion breakdown percentages
 */
function calculateEmotionBreakdown(tradesWithSentiment) {
  const totals = {
    overconfidence: 0,
    fear: 0,
    fomo: 0,
    discipline: 0,
    greed: 0,
    revenge: 0,
    neutral: 0
  };
  
  let totalWithNotes = 0;
  
  tradesWithSentiment.forEach(({ analysis }) => {
    if (!analysis.hasNotes) return;
    totalWithNotes++;
    
    const dominant = analysis.emotions.dominant;
    if (totals.hasOwnProperty(dominant)) {
      totals[dominant]++;
    } else {
      totals.neutral++;
    }
  });
  
  if (totalWithNotes === 0) {
    return totals;
  }
  
  // Convert to percentages
  const percentages = {};
  Object.entries(totals).forEach(([emotion, count]) => {
    percentages[emotion] = parseFloat(((count / totalWithNotes) * 100).toFixed(1));
  });
  
  return percentages;
}

/**
 * Main function to analyze sentiment across all trades
 */
export function analyzeSentiment(trades) {
  if (!trades || trades.length === 0) {
    return {
      success: false,
      message: 'No trades available for sentiment analysis',
      data: null
    };
  }
  
  // Filter to closed/reviewed trades
  const closedTrades = trades.filter(t => t.status === 'closed' || t.status === 'reviewed');
  
  // Analyze each trade
  const tradesWithSentiment = closedTrades.map(trade => ({
    trade,
    analysis: analyzeTradeNotes(trade)
  }));
  
  // Filter trades with notes
  const tradesWithNotes = tradesWithSentiment.filter(t => t.analysis.hasNotes);
  
  if (tradesWithNotes.length === 0) {
    return {
      success: false,
      message: 'No trades have notes for sentiment analysis',
      data: null
    };
  }
  
  // Calculate overall sentiment
  const avgComparative = tradesWithNotes.reduce((sum, t) => sum + t.analysis.sentiment.comparative, 0) / tradesWithNotes.length;
  
  let overallLabel = 'neutral';
  if (avgComparative > 0.1) overallLabel = 'slightly_positive';
  else if (avgComparative > 0.2) overallLabel = 'positive';
  else if (avgComparative < -0.1) overallLabel = 'slightly_negative';
  else if (avgComparative < -0.2) overallLabel = 'negative';
  
  // Get correlations
  const correlations = correlateSentimentWithOutcomes(tradesWithSentiment);
  
  // Get emotion breakdown
  const emotionBreakdown = calculateEmotionBreakdown(tradesWithSentiment);
  
  // Get trend
  const trend = analyzeTrend(tradesWithSentiment);
  
  // Calculate sentiment score (0-100, 50 = neutral)
  const sentimentScore = Math.max(0, Math.min(100, Math.round(50 + avgComparative * 100)));
  
  return {
    success: true,
    data: {
      overallSentiment: {
        score: sentimentScore,
        comparative: parseFloat(avgComparative.toFixed(3)),
        label: overallLabel
      },
      emotionBreakdown,
      correlations,
      trend,
      tradesAnalyzed: closedTrades.length,
      tradesWithNotes: tradesWithNotes.length
    }
  };
}

export default {
  analyzeSentiment,
  analyzeTradeNotes
};
