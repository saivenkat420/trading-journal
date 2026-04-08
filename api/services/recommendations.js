/**
 * Recommendations Engine
 * Generates personalized trading recommendations based on pattern and sentiment analysis
 */

/**
 * Recommendation rules configuration
 */
const recommendationRules = [
  // Session-based recommendations
  {
    id: 'best_session',
    category: 'strength',
    priority: 'high',
    check: (patterns) => {
      const sessions = patterns.sessionAnalysis;
      if (!sessions) return null;
      
      let bestSession = null;
      let bestWinRate = 0;
      
      Object.entries(sessions).forEach(([session, stats]) => {
        if (stats.totalTrades >= 5 && stats.winRate > bestWinRate) {
          bestWinRate = stats.winRate;
          bestSession = session;
        }
      });
      
      if (bestSession && bestWinRate >= 60) {
        return {
          title: `Focus on ${formatLabel(bestSession)} Session`,
          description: `Your win rate is ${bestWinRate}% during ${formatLabel(bestSession)} session with ${sessions[bestSession].totalTrades} trades. This is your strongest trading time.`,
          metric: { label: 'Win Rate', value: `${bestWinRate}%` },
          action: `Prioritize trading during ${formatLabel(bestSession)} session`
        };
      }
      return null;
    }
  },
  {
    id: 'worst_session',
    category: 'warning',
    priority: 'high',
    check: (patterns) => {
      const sessions = patterns.sessionAnalysis;
      if (!sessions) return null;
      
      let worstSession = null;
      let worstWinRate = 100;
      
      Object.entries(sessions).forEach(([session, stats]) => {
        if (stats.totalTrades >= 5 && stats.winRate < worstWinRate) {
          worstWinRate = stats.winRate;
          worstSession = session;
        }
      });
      
      if (worstSession && worstWinRate <= 40) {
        return {
          title: `Avoid ${formatLabel(worstSession)} Session`,
          description: `Your win rate drops to ${worstWinRate}% during ${formatLabel(worstSession)} session. Consider reducing or avoiding trades during this time.`,
          metric: { label: 'Win Rate', value: `${worstWinRate}%` },
          action: `Reduce trading during ${formatLabel(worstSession)} session`
        };
      }
      return null;
    }
  },
  
  // Day of week recommendations
  {
    id: 'best_day',
    category: 'strength',
    priority: 'medium',
    check: (patterns) => {
      const days = patterns.dayOfWeekAnalysis;
      if (!days) return null;
      
      let bestDay = null;
      let bestWinRate = 0;
      
      Object.entries(days).forEach(([day, stats]) => {
        if (stats.totalTrades >= 3 && stats.winRate > bestWinRate) {
          bestWinRate = stats.winRate;
          bestDay = day;
        }
      });
      
      if (bestDay && bestWinRate >= 65) {
        return {
          title: `${formatLabel(bestDay)}s Are Your Best Day`,
          description: `You have a ${bestWinRate}% win rate on ${formatLabel(bestDay)}s based on ${days[bestDay].totalTrades} trades.`,
          metric: { label: 'Win Rate', value: `${bestWinRate}%` },
          action: `Consider increasing position size on ${formatLabel(bestDay)}s`
        };
      }
      return null;
    }
  },
  {
    id: 'worst_day',
    category: 'warning',
    priority: 'medium',
    check: (patterns) => {
      const days = patterns.dayOfWeekAnalysis;
      if (!days) return null;
      
      let worstDay = null;
      let worstWinRate = 100;
      
      Object.entries(days).forEach(([day, stats]) => {
        if (stats.totalTrades >= 3 && stats.winRate < worstWinRate) {
          worstWinRate = stats.winRate;
          worstDay = day;
        }
      });
      
      if (worstDay && worstWinRate <= 35) {
        return {
          title: `Avoid Trading on ${formatLabel(worstDay)}s`,
          description: `Your win rate is only ${worstWinRate}% on ${formatLabel(worstDay)}s. Consider taking the day off.`,
          metric: { label: 'Win Rate', value: `${worstWinRate}%` },
          action: `Consider not trading on ${formatLabel(worstDay)}s`
        };
      }
      return null;
    }
  },
  
  // Streak-based recommendations
  {
    id: 'after_loss_warning',
    category: 'behavioral',
    priority: 'high',
    check: (patterns) => {
      const streaks = patterns.streakAnalysis;
      if (!streaks?.afterLoss) return null;
      
      const stats = streaks.afterLoss;
      if (stats.totalTrades >= 5 && stats.winRate < 40) {
        return {
          title: 'Take a Break After Losses',
          description: `Your win rate drops to ${stats.winRate}% on trades taken immediately after a loss. This suggests emotional trading.`,
          metric: { label: 'Post-Loss Win Rate', value: `${stats.winRate}%` },
          action: 'Wait at least 1 hour or until next session after a losing trade'
        };
      }
      return null;
    }
  },
  {
    id: 'after_2_losses_critical',
    category: 'behavioral',
    priority: 'critical',
    check: (patterns) => {
      const streaks = patterns.streakAnalysis;
      if (!streaks?.after2Losses) return null;
      
      const stats = streaks.after2Losses;
      if (stats.totalTrades >= 3 && stats.winRate < 35) {
        return {
          title: 'Stop Trading After 2 Consecutive Losses',
          description: `Your win rate crashes to ${stats.winRate}% after 2 consecutive losses. This is a critical pattern to break.`,
          metric: { label: 'Win Rate After 2 Losses', value: `${stats.winRate}%` },
          action: 'Implement a mandatory break after 2 losses in a row'
        };
      }
      return null;
    }
  },
  {
    id: 'winning_streak_caution',
    category: 'warning',
    priority: 'medium',
    check: (patterns) => {
      const streaks = patterns.streakAnalysis;
      if (!streaks?.after2Wins) return null;
      
      const stats = streaks.after2Wins;
      if (stats.totalTrades >= 3 && stats.winRate < 45) {
        return {
          title: 'Beware of Overconfidence After Wins',
          description: `Your win rate drops to ${stats.winRate}% after 2 consecutive wins. You may be getting overconfident.`,
          metric: { label: 'Post-Streak Win Rate', value: `${stats.winRate}%` },
          action: 'Maintain discipline and stick to your plan after winning streaks'
        };
      }
      return null;
    }
  },
  
  // Trade type recommendations
  {
    id: 'best_trade_type',
    category: 'strength',
    priority: 'medium',
    check: (patterns) => {
      const types = patterns.tradeTypeAnalysis;
      if (!types) return null;
      
      const longStats = types.long;
      const shortStats = types.short;
      
      if (longStats && shortStats && longStats.totalTrades >= 5 && shortStats.totalTrades >= 5) {
        const diff = longStats.winRate - shortStats.winRate;
        
        if (diff > 15) {
          return {
            title: 'You Excel at Long Trades',
            description: `Your long trades have a ${longStats.winRate}% win rate vs ${shortStats.winRate}% for shorts. Consider focusing on long setups.`,
            metric: { label: 'Long Win Rate', value: `${longStats.winRate}%` },
            action: 'Prioritize long trade setups'
          };
        } else if (diff < -15) {
          return {
            title: 'You Excel at Short Trades',
            description: `Your short trades have a ${shortStats.winRate}% win rate vs ${longStats.winRate}% for longs. Consider focusing on short setups.`,
            metric: { label: 'Short Win Rate', value: `${shortStats.winRate}%` },
            action: 'Prioritize short trade setups'
          };
        }
      }
      return null;
    }
  },
  
  // Confidence level recommendations
  {
    id: 'confidence_correlation',
    category: 'insight',
    priority: 'medium',
    check: (patterns) => {
      const confidence = patterns.confidenceAnalysis;
      if (!confidence) return null;
      
      const good = confidence.good;
      const bad = confidence.bad;
      
      if (good && bad && good.totalTrades >= 5 && bad.totalTrades >= 5) {
        if (good.winRate > bad.winRate + 20) {
          return {
            title: 'Trust Your High-Confidence Setups',
            description: `High-confidence trades win ${good.winRate}% vs ${bad.winRate}% for low-confidence. Your intuition is calibrated well.`,
            metric: { label: 'High Confidence Win Rate', value: `${good.winRate}%` },
            action: 'Consider increasing size on high-confidence setups'
          };
        } else if (bad.winRate > good.winRate) {
          return {
            title: 'Recalibrate Your Confidence Assessment',
            description: `Surprisingly, your low-confidence trades (${bad.winRate}%) outperform high-confidence ones (${good.winRate}%). You may be overconfident on some setups.`,
            metric: { label: 'Confidence Gap', value: `${bad.winRate - good.winRate}%` },
            action: 'Review what makes you confident - it may not be the right signals'
          };
        }
      }
      return null;
    }
  },
  
  // Asset class recommendations
  {
    id: 'best_asset_class',
    category: 'strength',
    priority: 'medium',
    check: (patterns) => {
      const assets = patterns.assetClassAnalysis;
      if (!assets) return null;
      
      let bestAsset = null;
      let bestWinRate = 0;
      
      Object.entries(assets).forEach(([asset, stats]) => {
        if (stats.totalTrades >= 5 && stats.winRate > bestWinRate) {
          bestWinRate = stats.winRate;
          bestAsset = asset;
        }
      });
      
      if (bestAsset && bestWinRate >= 60) {
        return {
          title: `${formatLabel(bestAsset)} is Your Best Asset Class`,
          description: `You have a ${bestWinRate}% win rate trading ${formatLabel(bestAsset)} with average P&L of $${assets[bestAsset].avgPnl.toFixed(2)} per trade.`,
          metric: { label: 'Win Rate', value: `${bestWinRate}%` },
          action: `Focus more on ${formatLabel(bestAsset)} trading`
        };
      }
      return null;
    }
  },
  
  // Pattern-based recommendations
  {
    id: 'top_pattern',
    category: 'strength',
    priority: 'high',
    check: (patterns) => {
      const winning = patterns.winningPatterns;
      if (!winning || winning.length === 0) return null;
      
      const top = winning[0];
      if (top.winRate >= 65 && top.totalTrades >= 5) {
        return {
          title: `Your Winning Formula: ${top.label}`,
          description: `This combination has a ${top.winRate}% win rate across ${top.totalTrades} trades with average P&L of $${top.avgPnl.toFixed(2)}.`,
          metric: { label: 'Win Rate', value: `${top.winRate}%` },
          action: 'Actively look for setups matching this pattern'
        };
      }
      return null;
    }
  },
  {
    id: 'avoid_pattern',
    category: 'warning',
    priority: 'high',
    check: (patterns) => {
      const losing = patterns.losingPatterns;
      if (!losing || losing.length === 0) return null;
      
      const worst = losing[0];
      if (worst.winRate <= 35 && worst.totalTrades >= 5) {
        return {
          title: `Avoid This Pattern: ${worst.label}`,
          description: `This combination has only a ${worst.winRate}% win rate across ${worst.totalTrades} trades, losing an average of $${Math.abs(worst.avgPnl).toFixed(2)} per trade.`,
          metric: { label: 'Win Rate', value: `${worst.winRate}%` },
          action: 'Skip trades matching this pattern'
        };
      }
      return null;
    }
  }
];

/**
 * Sentiment-based recommendation rules
 */
const sentimentRules = [
  {
    id: 'overconfidence_warning',
    category: 'behavioral',
    priority: 'high',
    check: (sentiment) => {
      const overconfident = sentiment.correlations?.overconfident;
      if (!overconfident || overconfident.count < 3) return null;
      
      if (overconfident.winRate < 40) {
        return {
          title: 'Overconfidence is Hurting Your Results',
          description: `Trades where you expressed overconfidence have only a ${overconfident.winRate}% win rate. Confidence is good, but certainty often leads to poor risk management.`,
          metric: { label: 'Overconfident Win Rate', value: `${overconfident.winRate}%` },
          action: 'When you feel "certain", reduce position size by 50%'
        };
      }
      return null;
    }
  },
  {
    id: 'discipline_strength',
    category: 'strength',
    priority: 'medium',
    check: (sentiment) => {
      const disciplined = sentiment.correlations?.disciplined;
      if (!disciplined || disciplined.count < 3) return null;
      
      if (disciplined.winRate >= 60) {
        return {
          title: 'Discipline is Your Edge',
          description: `When you mention following your plan and rules, your win rate jumps to ${disciplined.winRate}%. Keep documenting your discipline.`,
          metric: { label: 'Disciplined Win Rate', value: `${disciplined.winRate}%` },
          action: 'Always write down how the trade fits your plan before entering'
        };
      }
      return null;
    }
  },
  {
    id: 'fomo_warning',
    category: 'behavioral',
    priority: 'critical',
    check: (sentiment) => {
      const fomo = sentiment.correlations?.fomo;
      if (!fomo || fomo.count < 2) return null;
      
      if (fomo.winRate < 35) {
        return {
          title: 'FOMO is Destroying Your Results',
          description: `Trades driven by fear of missing out have a ${fomo.winRate}% win rate. Chasing moves rarely works.`,
          metric: { label: 'FOMO Win Rate', value: `${fomo.winRate}%` },
          action: 'If you feel FOMO, it\'s probably too late - wait for the next setup'
        };
      }
      return null;
    }
  },
  {
    id: 'revenge_trading',
    category: 'behavioral',
    priority: 'critical',
    check: (sentiment) => {
      const revenge = sentiment.correlations?.revenge;
      if (!revenge || revenge.count < 2) return null;
      
      if (revenge.winRate < 30) {
        return {
          title: 'Revenge Trading is Extremely Costly',
          description: `Revenge trades have a ${revenge.winRate}% win rate and average loss of $${Math.abs(revenge.avgPnl).toFixed(2)}. This is your most destructive pattern.`,
          metric: { label: 'Revenge Win Rate', value: `${revenge.winRate}%` },
          action: 'Implement a mandatory 24-hour break after any revenge trade urge'
        };
      }
      return null;
    }
  },
  {
    id: 'sentiment_trend',
    category: 'insight',
    priority: 'low',
    check: (sentiment) => {
      const trend = sentiment.trend;
      if (!trend || trend.trend === 'insufficient_data') return null;
      
      if (trend.trend === 'improving') {
        return {
          title: 'Your Trading Mindset is Improving',
          description: `Your sentiment scores are trending more positive, suggesting better emotional control and discipline.`,
          metric: { label: 'Trend', value: 'Improving' },
          action: 'Keep journaling - it\'s helping you improve'
        };
      } else if (trend.trend === 'declining') {
        return {
          title: 'Your Trading Mindset is Declining',
          description: `Your recent notes show more negative emotions. Consider taking a break or reducing size.`,
          metric: { label: 'Trend', value: 'Declining' },
          action: 'Take a day off and review your recent journal entries'
        };
      }
      return null;
    }
  }
];

/**
 * Format label for display
 */
function formatLabel(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).replace(/_/g, ' ');
}

/**
 * Generate recommendations from pattern analysis
 */
function generatePatternRecommendations(patterns) {
  const recommendations = [];
  
  recommendationRules.forEach(rule => {
    try {
      const result = rule.check(patterns);
      if (result) {
        recommendations.push({
          id: rule.id,
          category: rule.category,
          priority: rule.priority,
          ...result
        });
      }
    } catch (error) {
      console.error(`Error in recommendation rule ${rule.id}:`, error);
    }
  });
  
  return recommendations;
}

/**
 * Generate recommendations from sentiment analysis
 */
function generateSentimentRecommendations(sentiment) {
  const recommendations = [];
  
  sentimentRules.forEach(rule => {
    try {
      const result = rule.check(sentiment);
      if (result) {
        recommendations.push({
          id: rule.id,
          category: rule.category,
          priority: rule.priority,
          ...result
        });
      }
    } catch (error) {
      console.error(`Error in sentiment rule ${rule.id}:`, error);
    }
  });
  
  return recommendations;
}

/**
 * Sort recommendations by priority
 */
function sortByPriority(recommendations) {
  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  return recommendations.sort((a, b) => {
    return (priorityOrder[a.priority] || 3) - (priorityOrder[b.priority] || 3);
  });
}

/**
 * Main function to generate all recommendations
 */
export function generateRecommendations(patternAnalysis, sentimentAnalysis) {
  const allRecommendations = [];
  
  // Generate pattern-based recommendations
  if (patternAnalysis?.success && patternAnalysis.data) {
    const patternRecs = generatePatternRecommendations(patternAnalysis.data);
    allRecommendations.push(...patternRecs);
  }
  
  // Generate sentiment-based recommendations
  if (sentimentAnalysis?.success && sentimentAnalysis.data) {
    const sentimentRecs = generateSentimentRecommendations(sentimentAnalysis.data);
    allRecommendations.push(...sentimentRecs);
  }
  
  // Sort by priority
  const sorted = sortByPriority(allRecommendations);
  
  // Group by category
  const grouped = {
    critical: sorted.filter(r => r.priority === 'critical'),
    strengths: sorted.filter(r => r.category === 'strength'),
    warnings: sorted.filter(r => r.category === 'warning' && r.priority !== 'critical'),
    behavioral: sorted.filter(r => r.category === 'behavioral' && r.priority !== 'critical'),
    insights: sorted.filter(r => r.category === 'insight')
  };
  
  return {
    success: true,
    data: {
      all: sorted,
      grouped,
      totalCount: sorted.length,
      criticalCount: grouped.critical.length
    }
  };
}

export default {
  generateRecommendations
};
