import { useState, useEffect } from 'react';
import { Card, LoadingSpinner, ErrorMessage } from '../components';
import { aiApi } from '../utils/api';

interface PatternData {
  pattern: string;
  label: string;
  winRate: number;
  avgPnl: number;
  totalTrades: number;
  totalPnl: number;
}

interface SessionStats {
  totalTrades: number;
  wins: number;
  losses: number;
  winRate: number;
  avgPnl: number;
  totalPnl: number;
}

interface StreakStats {
  totalTrades: number;
  wins: number;
  losses: number;
  winRate: number;
  avgPnl: number;
}

interface PatternAnalysis {
  patternScore: number;
  overall: SessionStats;
  sessionAnalysis: Record<string, SessionStats>;
  dayOfWeekAnalysis: Record<string, SessionStats>;
  winningPatterns: PatternData[];
  losingPatterns: PatternData[];
  streakAnalysis: {
    afterWin: StreakStats | null;
    afterLoss: StreakStats | null;
    after2Losses: StreakStats | null;
  };
  totalTradesAnalyzed: number;
}

interface SentimentData {
  overallSentiment: {
    score: number;
    comparative: number;
    label: string;
  };
  emotionBreakdown: Record<string, number>;
  correlations: Record<string, {
    count: number;
    wins: number;
    losses: number;
    winRate: number;
    avgPnl: number;
  }>;
  trend: {
    trend: string;
    change: number;
  };
  tradesAnalyzed: number;
  tradesWithNotes: number;
}

interface Recommendation {
  id: string;
  category: string;
  priority: string;
  title: string;
  description: string;
  metric?: { label: string; value: string };
  action: string;
}

interface RecommendationsData {
  all: Recommendation[];
  grouped: {
    critical: Recommendation[];
    strengths: Recommendation[];
    warnings: Recommendation[];
    behavioral: Recommendation[];
    insights: Recommendation[];
  };
  totalCount: number;
  criticalCount: number;
}

interface ModelStats {
  accuracy: number;
  trainedOn: number;
  ready: boolean;
}

interface AIInsightsData {
  patterns: PatternAnalysis | null;
  sentiment: SentimentData | null;
  recommendations: RecommendationsData | null;
  modelStats: ModelStats | null;
  tradesAnalyzed: number;
}

const sectionTitleClass = "text-lg font-semibold text-dark-text-primary mb-4";
const cardItemClass =
  "p-3 rounded-lg border border-dark-border-primary bg-dark-bg-tertiary hover:bg-dark-bg-elevated transition-colors";
const metricTextClass = "text-sm text-dark-text-secondary";
const metaTextClass = "text-xs text-dark-text-tertiary";

const semanticMetricStyles = {
  positive: "text-dark-accent-success",
  negative: "text-dark-accent-danger",
  neutral: "text-dark-text-secondary",
} as const;

const recommendationCategoryStyles: Record<string, string> = {
  critical: "border-dark-accent-danger bg-dark-accent-danger/10",
  strengths: "border-dark-accent-success bg-dark-accent-success/10",
  warnings: "border-dark-accent-warning bg-dark-accent-warning/10",
  behavioral: "border-dark-accent-secondary bg-dark-accent-secondary/10",
  insights: "border-dark-accent-primary bg-dark-accent-primary/10",
};

const priorityBadgeStyles: Record<string, string> = {
  critical: "bg-dark-accent-danger/20 text-dark-accent-danger",
  high: "bg-dark-accent-warning/20 text-dark-accent-warning",
  medium: "bg-dark-accent-secondary/20 text-dark-accent-secondary",
  low: "bg-dark-bg-elevated text-dark-text-secondary",
};

const emotionBarStyles: Record<string, string> = {
  discipline: "bg-dark-accent-success",
  overconfidence: "bg-dark-accent-danger",
  fear: "bg-dark-accent-warning",
  fomo: "bg-dark-accent-warning",
  greed: "bg-dark-accent-secondary",
  revenge: "bg-dark-accent-danger",
  neutral: "bg-dark-text-tertiary",
};

export default function AIInsights() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<AIInsightsData | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'patterns' | 'sentiment' | 'recommendations'>('overview');

  const fetchInsights = async (refresh = false) => {
    try {
      setLoading(true);
      setError(null);
      const response = await aiApi.getAllInsights(refresh);
      setData(response.data.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load AI insights');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInsights();
  }, []);

  const handleRefresh = () => {
    fetchInsights(true);
  };

  if (loading && !data) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  const patterns = data?.patterns;
  const sentiment = data?.sentiment;
  const recommendations = data?.recommendations;
  const modelStats = data?.modelStats;

  return (
    <div className="space-y-4 sm:space-y-6 text-dark-text-primary">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-dark-text-primary">AI Trading Insights</h1>
          <p className="text-sm text-dark-text-secondary mt-1">
            AI-powered analysis of your trading patterns and behavior
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={loading}
          className="px-3 py-1.5 bg-dark-accent-primary text-white rounded-lg hover:opacity-90 disabled:opacity-50 flex items-center gap-2 text-sm"
        >
          {loading ? (
            <>
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Analyzing...
            </>
          ) : (
            <>
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh Data
            </>
          )}
        </button>
      </div>

      {error && <ErrorMessage message={error} />}

      {/* Score Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <Card className="p-4 text-center">
          <div className="text-xs text-dark-text-secondary mb-1">Pattern Score</div>
          <div className="text-2xl font-bold text-dark-accent-primary">
            {patterns?.patternScore ?? '--'}/100
          </div>
          <div className="text-xs text-dark-text-tertiary mt-1">
            Based on {patterns?.totalTradesAnalyzed ?? 0} trades
          </div>
        </Card>

        <Card className="p-4 text-center">
          <div className="text-xs text-dark-text-secondary mb-1">Prediction Model</div>
          <div className="text-2xl font-bold text-dark-accent-success">
            {modelStats?.ready ? `${modelStats.accuracy}%` : 'Not Ready'}
          </div>
          <div className="text-xs text-dark-text-tertiary mt-1">
            {modelStats?.ready ? `Trained on ${modelStats.trainedOn} trades` : 'Need more trades'}
          </div>
        </Card>

        <Card className="p-4 text-center">
          <div className="text-xs text-dark-text-secondary mb-1">Sentiment Score</div>
          <div className="text-2xl font-bold text-dark-accent-secondary">
            {sentiment?.overallSentiment?.score ?? '--'}/100
          </div>
          <div className="text-xs text-dark-text-tertiary mt-1 capitalize">
            {sentiment?.overallSentiment?.label?.replace('_', ' ') ?? 'N/A'}
          </div>
        </Card>

        <Card className="p-4 text-center">
          <div className="text-xs text-dark-text-secondary mb-1">Recommendations</div>
          <div className="text-2xl font-bold text-dark-accent-warning">
            {recommendations?.totalCount ?? 0}
          </div>
          <div className="text-xs text-dark-text-tertiary mt-1">
            {recommendations?.criticalCount ?? 0} critical
          </div>
        </Card>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-dark-border-primary">
        <nav className="flex space-x-8">
          {(['overview', 'patterns', 'sentiment', 'recommendations'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-4 px-1 border-b-2 font-medium text-sm capitalize ${
                activeTab === tab
                  ? 'border-dark-accent-primary text-dark-accent-primary'
                  : 'border-transparent text-dark-text-tertiary hover:text-dark-text-secondary hover:border-dark-border-secondary'
              }`}
            >
              {tab}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <OverviewTab patterns={patterns ?? null} sentiment={sentiment ?? null} recommendations={recommendations ?? null} />
      )}
      {activeTab === 'patterns' && <PatternsTab patterns={patterns ?? null} />}
      {activeTab === 'sentiment' && <SentimentTab sentiment={sentiment ?? null} />}
      {activeTab === 'recommendations' && <RecommendationsTab recommendations={recommendations ?? null} />}
    </div>
  );
}

function OverviewTab({ patterns, sentiment, recommendations }: { patterns: PatternAnalysis | null; sentiment: SentimentData | null; recommendations: RecommendationsData | null }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Top Winning Patterns */}
      <Card className="p-6">
        <h3 className={sectionTitleClass}>Top Winning Patterns</h3>
        {patterns?.winningPatterns && patterns.winningPatterns.length > 0 ? (
          <div className="space-y-3">
            {patterns.winningPatterns.slice(0, 5).map((pattern, idx) => (
              <div key={idx} className={cardItemClass}>
                <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-dark-text-primary">{pattern.label}</div>
                  <div className={metricTextClass}>{pattern.totalTrades} trades</div>
                </div>
                <div className="text-right">
                  <div className={`font-bold ${semanticMetricStyles.positive}`}>{pattern.winRate.toFixed(1)}%</div>
                  <div className={metricTextClass}>${pattern.avgPnl.toFixed(2)} avg</div>
                </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-dark-text-tertiary text-center py-4">No significant patterns detected yet</p>
        )}
      </Card>

      {/* Patterns to Avoid */}
      <Card className="p-6">
        <h3 className={sectionTitleClass}>Patterns to Avoid</h3>
        {patterns?.losingPatterns && patterns.losingPatterns.length > 0 ? (
          <div className="space-y-3">
            {patterns.losingPatterns.slice(0, 5).map((pattern, idx) => (
              <div key={idx} className={cardItemClass}>
                <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-dark-text-primary">{pattern.label}</div>
                  <div className={metricTextClass}>{pattern.totalTrades} trades</div>
                </div>
                <div className="text-right">
                  <div className={`font-bold ${semanticMetricStyles.negative}`}>{pattern.winRate.toFixed(1)}%</div>
                  <div className={metricTextClass}>${pattern.avgPnl.toFixed(2)} avg</div>
                </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-dark-text-tertiary text-center py-4">No significant losing patterns detected</p>
        )}
      </Card>

      {/* Critical Recommendations */}
      <Card className="p-6 lg:col-span-2">
        <h3 className={sectionTitleClass}>Top Recommendations</h3>
        {recommendations?.all && recommendations.all.length > 0 ? (
          <div className="space-y-4">
            {recommendations.all.slice(0, 4).map((rec, idx) => (
              <div
                key={idx}
                className={`p-4 rounded-lg border-l-4 ${
                  rec.priority === 'critical'
                    ? 'bg-dark-accent-danger/10 border-dark-accent-danger'
                    : rec.category === 'strength'
                    ? 'bg-dark-accent-success/10 border-dark-accent-success'
                    : rec.category === 'warning'
                    ? 'bg-dark-accent-warning/10 border-dark-accent-warning'
                    : 'bg-dark-accent-primary/10 border-dark-accent-primary'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-semibold text-dark-text-primary">{rec.title}</h4>
                    <p className="text-sm text-dark-text-secondary mt-1">{rec.description}</p>
                    <p className="text-sm font-medium text-dark-text-secondary mt-2">
                      Action: {rec.action}
                    </p>
                  </div>
                  {rec.metric && (
                    <div className="text-right ml-4">
                      <div className={metaTextClass}>{rec.metric.label}</div>
                      <div className="font-bold text-dark-text-primary">{rec.metric.value}</div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-dark-text-tertiary text-center py-4">No recommendations available yet</p>
        )}
      </Card>

      {/* Emotion Correlations */}
      <Card className="p-6 lg:col-span-2">
        <h3 className={sectionTitleClass}>Emotion-Outcome Correlations</h3>
        {sentiment?.correlations ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(sentiment.correlations)
              .filter(([_, data]) => data.count >= 2)
              .map(([emotion, data]) => (
                <div key={emotion} className="p-4 bg-dark-bg-tertiary border border-dark-border-primary rounded-lg text-center">
                  <div className="text-sm text-dark-text-secondary capitalize">{emotion}</div>
                  <div className={`text-2xl font-bold ${data.winRate >= 50 ? semanticMetricStyles.positive : semanticMetricStyles.negative}`}>
                    {data.winRate.toFixed(1)}%
                  </div>
                  <div className={metaTextClass}>{data.count} trades</div>
                </div>
              ))}
          </div>
        ) : (
          <p className="text-dark-text-tertiary text-center py-4">Not enough notes for sentiment analysis</p>
        )}
      </Card>
    </div>
  );
}

function PatternsTab({ patterns }: { patterns: PatternAnalysis | null }) {
  if (!patterns) {
    return <p className="text-dark-text-tertiary text-center py-8">No pattern data available</p>;
  }

  return (
    <div className="space-y-6">
      {/* Session Analysis */}
      <Card className="p-6">
        <h3 className={sectionTitleClass}>Performance by Session</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.entries(patterns.sessionAnalysis || {}).map(([session, stats]) => (
            <div key={session} className="p-4 bg-dark-bg-tertiary border border-dark-border-primary rounded-lg">
              <div className="text-sm text-dark-text-secondary capitalize mb-2">{session.replace('_', ' ')}</div>
              <div className={`text-2xl font-bold ${stats.winRate >= 50 ? semanticMetricStyles.positive : semanticMetricStyles.negative}`}>
                {stats.winRate.toFixed(1)}%
              </div>
              <div className="text-sm text-dark-text-secondary">{stats.totalTrades} trades</div>
              <div className="text-sm text-dark-text-secondary">${stats.avgPnl.toFixed(2)} avg</div>
            </div>
          ))}
        </div>
      </Card>

      {/* Day of Week Analysis */}
      <Card className="p-6">
        <h3 className={sectionTitleClass}>Performance by Day</h3>
        <div className="grid grid-cols-3 md:grid-cols-7 gap-2">
          {['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'].map((day) => {
            const stats = patterns.dayOfWeekAnalysis?.[day];
            return (
              <div key={day} className="p-3 bg-dark-bg-tertiary border border-dark-border-primary rounded-lg text-center">
                <div className="text-xs text-dark-text-secondary capitalize">{day.slice(0, 3)}</div>
                {stats ? (
                  <>
                    <div className={`text-lg font-bold ${stats.winRate >= 50 ? semanticMetricStyles.positive : semanticMetricStyles.negative}`}>
                      {stats.winRate.toFixed(0)}%
                    </div>
                    <div className={metaTextClass}>{stats.totalTrades}</div>
                  </>
                ) : (
                  <div className="text-dark-text-tertiary">-</div>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      {/* Streak Analysis */}
      <Card className="p-6">
        <h3 className={sectionTitleClass}>Streak Analysis</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { key: 'afterWin', label: 'After 1 Win' },
            { key: 'afterLoss', label: 'After 1 Loss' },
            { key: 'after2Losses', label: 'After 2 Losses' },
          ].map(({ key, label }) => {
            const stats = patterns.streakAnalysis?.[key as keyof typeof patterns.streakAnalysis];
            return (
              <div key={key} className="p-4 bg-dark-bg-tertiary border border-dark-border-primary rounded-lg">
                <div className="text-sm text-dark-text-secondary mb-2">{label}</div>
                {stats ? (
                  <>
                    <div className={`text-2xl font-bold ${stats.winRate >= 50 ? semanticMetricStyles.positive : semanticMetricStyles.negative}`}>
                      {stats.winRate.toFixed(1)}%
                    </div>
                    <div className="text-sm text-dark-text-secondary">{stats.totalTrades} trades</div>
                  </>
                ) : (
                  <div className="text-dark-text-tertiary">No data</div>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      {/* All Winning Patterns */}
      <Card className="p-6">
        <h3 className={sectionTitleClass}>All Winning Patterns</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="text-left text-xs text-dark-text-tertiary uppercase tracking-wider">
                <th className="pb-3">Pattern</th>
                <th className="pb-3 text-right">Win Rate</th>
                <th className="pb-3 text-right">Avg P&L</th>
                <th className="pb-3 text-right">Total P&L</th>
                <th className="pb-3 text-right">Trades</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-border-primary">
              {patterns.winningPatterns?.map((pattern, idx) => (
                <tr key={idx} className="hover:bg-dark-bg-tertiary transition-colors">
                  <td className="py-3 font-medium text-dark-text-primary">{pattern.label}</td>
                  <td className={`py-3 text-right font-medium ${semanticMetricStyles.positive}`}>{pattern.winRate.toFixed(1)}%</td>
                  <td className="py-3 text-right text-dark-text-secondary">${pattern.avgPnl.toFixed(2)}</td>
                  <td className="py-3 text-right text-dark-text-secondary">${pattern.totalPnl.toFixed(2)}</td>
                  <td className="py-3 text-right text-dark-text-secondary">{pattern.totalTrades}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function SentimentTab({ sentiment }: { sentiment: SentimentData | null }) {
  if (!sentiment) {
    return <p className="text-dark-text-tertiary text-center py-8">No sentiment data available. Add notes to your trades for analysis.</p>;
  }

  return (
    <div className="space-y-6">
      {/* Overall Sentiment */}
      <Card className="p-6">
        <h3 className={sectionTitleClass}>Overall Sentiment</h3>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-4xl font-bold text-dark-accent-secondary">{sentiment.overallSentiment.score}/100</div>
            <div className="text-dark-text-secondary capitalize mt-1">
              {sentiment.overallSentiment.label.replace('_', ' ')}
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm text-dark-text-secondary">Trend</div>
            <div className={`text-lg font-medium capitalize ${
              sentiment.trend.trend === 'improving' ? semanticMetricStyles.positive :
              sentiment.trend.trend === 'declining' ? semanticMetricStyles.negative : semanticMetricStyles.neutral
            }`}>
              {sentiment.trend.trend.replace('_', ' ')}
            </div>
          </div>
        </div>
        <div className="mt-4 text-sm text-dark-text-secondary">
          Analyzed {sentiment.tradesWithNotes} trades with notes out of {sentiment.tradesAnalyzed} total
        </div>
      </Card>

      {/* Emotion Breakdown */}
      <Card className="p-6">
        <h3 className={sectionTitleClass}>Emotion Breakdown</h3>
        <div className="space-y-3">
          {Object.entries(sentiment.emotionBreakdown)
            .sort(([, a], [, b]) => b - a)
            .map(([emotion, percentage]) => (
              <div key={emotion} className="flex items-center gap-3">
                <div className="w-24 text-sm text-dark-text-secondary capitalize">{emotion}</div>
                <div className="flex-1 bg-dark-bg-tertiary border border-dark-border-primary rounded-full h-4">
                  <div
                    className={`h-4 rounded-full ${emotionBarStyles[emotion] || 'bg-dark-text-tertiary'}`}
                    style={{ width: `${Math.min(percentage, 100)}%` }}
                  />
                </div>
                <div className="w-12 text-right text-sm font-medium text-dark-text-primary">{percentage.toFixed(1)}%</div>
              </div>
            ))}
        </div>
      </Card>

      {/* Emotion-Outcome Correlations */}
      <Card className="p-6">
        <h3 className={sectionTitleClass}>Emotion-Outcome Correlations</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.entries(sentiment.correlations)
            .filter(([_, data]) => data.count >= 2)
            .sort(([, a], [, b]) => b.count - a.count)
            .map(([emotion, data]) => (
              <div key={emotion} className="p-4 bg-dark-bg-tertiary border border-dark-border-primary rounded-lg">
                <div className="text-sm text-dark-text-secondary capitalize mb-2">{emotion}</div>
                <div className={`text-2xl font-bold ${data.winRate >= 50 ? semanticMetricStyles.positive : semanticMetricStyles.negative}`}>
                  {data.winRate.toFixed(1)}%
                </div>
                <div className="text-sm text-dark-text-secondary">{data.count} trades</div>
                <div className="text-sm text-dark-text-secondary">${data.avgPnl.toFixed(2)} avg</div>
              </div>
            ))}
        </div>
      </Card>
    </div>
  );
}

function RecommendationsTab({ recommendations }: { recommendations: RecommendationsData | null }) {
  if (!recommendations || recommendations.totalCount === 0) {
    return <p className="text-dark-text-tertiary text-center py-8">No recommendations available. Keep trading and adding notes for personalized insights.</p>;
  }

  const categoryLabels: Record<string, string> = {
    critical: 'Critical Issues',
    strengths: 'Your Strengths',
    warnings: 'Warnings',
    behavioral: 'Behavioral Improvements',
    insights: 'Insights',
  };

  return (
    <div className="space-y-6">
      {Object.entries(recommendations.grouped).map(([category, recs]) => {
        if (!recs || recs.length === 0) return null;
        return (
          <Card key={category} className="p-6">
            <h3 className={sectionTitleClass}>
              {categoryLabels[category] || category}
            </h3>
            <div className="space-y-4">
              {recs.map((rec, idx) => (
                <div
                  key={idx}
                  className={`p-4 rounded-lg border-l-4 ${recommendationCategoryStyles[category] || 'border-dark-border-secondary bg-dark-bg-tertiary'}`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-dark-text-primary">{rec.title}</h4>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          priorityBadgeStyles[rec.priority] || priorityBadgeStyles.low
                        }`}>
                          {rec.priority}
                        </span>
                      </div>
                      <p className="text-sm text-dark-text-secondary mt-1">{rec.description}</p>
                      <p className="text-sm font-medium text-dark-text-secondary mt-2">
                        <span className="text-dark-text-tertiary">Action:</span> {rec.action}
                      </p>
                    </div>
                    {rec.metric && (
                      <div className="text-right ml-4 flex-shrink-0">
                        <div className="text-xs text-dark-text-tertiary">{rec.metric.label}</div>
                        <div className="font-bold text-dark-text-primary text-lg">{rec.metric.value}</div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
