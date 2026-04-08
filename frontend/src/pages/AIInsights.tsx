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
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">AI Trading Insights</h1>
          <p className="text-gray-600 mt-1">
            AI-powered analysis of your trading patterns and behavior
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4 text-center">
          <div className="text-sm text-gray-600 mb-1">Pattern Score</div>
          <div className="text-3xl font-bold text-blue-600">
            {patterns?.patternScore ?? '--'}/100
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Based on {patterns?.totalTradesAnalyzed ?? 0} trades
          </div>
        </Card>

        <Card className="p-4 text-center">
          <div className="text-sm text-gray-600 mb-1">Prediction Model</div>
          <div className="text-3xl font-bold text-green-600">
            {modelStats?.ready ? `${modelStats.accuracy}%` : 'Not Ready'}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {modelStats?.ready ? `Trained on ${modelStats.trainedOn} trades` : 'Need more trades'}
          </div>
        </Card>

        <Card className="p-4 text-center">
          <div className="text-sm text-gray-600 mb-1">Sentiment Score</div>
          <div className="text-3xl font-bold text-purple-600">
            {sentiment?.overallSentiment?.score ?? '--'}/100
          </div>
          <div className="text-xs text-gray-500 mt-1 capitalize">
            {sentiment?.overallSentiment?.label?.replace('_', ' ') ?? 'N/A'}
          </div>
        </Card>

        <Card className="p-4 text-center">
          <div className="text-sm text-gray-600 mb-1">Recommendations</div>
          <div className="text-3xl font-bold text-orange-600">
            {recommendations?.totalCount ?? 0}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {recommendations?.criticalCount ?? 0} critical
          </div>
        </Card>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {(['overview', 'patterns', 'sentiment', 'recommendations'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-4 px-1 border-b-2 font-medium text-sm capitalize ${
                activeTab === tab
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
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
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Winning Patterns</h3>
        {patterns?.winningPatterns && patterns.winningPatterns.length > 0 ? (
          <div className="space-y-3">
            {patterns.winningPatterns.slice(0, 5).map((pattern, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div>
                  <div className="font-medium text-gray-900">{pattern.label}</div>
                  <div className="text-sm text-gray-600">{pattern.totalTrades} trades</div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-green-600">{pattern.winRate.toFixed(1)}%</div>
                  <div className="text-sm text-gray-600">${pattern.avgPnl.toFixed(2)} avg</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-4">No significant patterns detected yet</p>
        )}
      </Card>

      {/* Patterns to Avoid */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Patterns to Avoid</h3>
        {patterns?.losingPatterns && patterns.losingPatterns.length > 0 ? (
          <div className="space-y-3">
            {patterns.losingPatterns.slice(0, 5).map((pattern, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                <div>
                  <div className="font-medium text-gray-900">{pattern.label}</div>
                  <div className="text-sm text-gray-600">{pattern.totalTrades} trades</div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-red-600">{pattern.winRate.toFixed(1)}%</div>
                  <div className="text-sm text-gray-600">${pattern.avgPnl.toFixed(2)} avg</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-4">No significant losing patterns detected</p>
        )}
      </Card>

      {/* Critical Recommendations */}
      <Card className="p-6 lg:col-span-2">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Recommendations</h3>
        {recommendations?.all && recommendations.all.length > 0 ? (
          <div className="space-y-4">
            {recommendations.all.slice(0, 4).map((rec, idx) => (
              <div
                key={idx}
                className={`p-4 rounded-lg border-l-4 ${
                  rec.priority === 'critical'
                    ? 'bg-red-50 border-red-500'
                    : rec.category === 'strength'
                    ? 'bg-green-50 border-green-500'
                    : rec.category === 'warning'
                    ? 'bg-yellow-50 border-yellow-500'
                    : 'bg-blue-50 border-blue-500'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-semibold text-gray-900">{rec.title}</h4>
                    <p className="text-sm text-gray-600 mt-1">{rec.description}</p>
                    <p className="text-sm font-medium text-gray-700 mt-2">
                      Action: {rec.action}
                    </p>
                  </div>
                  {rec.metric && (
                    <div className="text-right ml-4">
                      <div className="text-xs text-gray-500">{rec.metric.label}</div>
                      <div className="font-bold text-gray-900">{rec.metric.value}</div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-4">No recommendations available yet</p>
        )}
      </Card>

      {/* Emotion Correlations */}
      <Card className="p-6 lg:col-span-2">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Emotion-Outcome Correlations</h3>
        {sentiment?.correlations ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(sentiment.correlations)
              .filter(([_, data]) => data.count >= 2)
              .map(([emotion, data]) => (
                <div key={emotion} className="p-4 bg-gray-50 rounded-lg text-center">
                  <div className="text-sm text-gray-600 capitalize">{emotion}</div>
                  <div className={`text-2xl font-bold ${data.winRate >= 50 ? 'text-green-600' : 'text-red-600'}`}>
                    {data.winRate.toFixed(1)}%
                  </div>
                  <div className="text-xs text-gray-500">{data.count} trades</div>
                </div>
              ))}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-4">Not enough notes for sentiment analysis</p>
        )}
      </Card>
    </div>
  );
}

function PatternsTab({ patterns }: { patterns: PatternAnalysis | null }) {
  if (!patterns) {
    return <p className="text-gray-500 text-center py-8">No pattern data available</p>;
  }

  return (
    <div className="space-y-6">
      {/* Session Analysis */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance by Session</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.entries(patterns.sessionAnalysis || {}).map(([session, stats]) => (
            <div key={session} className="p-4 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-600 capitalize mb-2">{session.replace('_', ' ')}</div>
              <div className={`text-2xl font-bold ${stats.winRate >= 50 ? 'text-green-600' : 'text-red-600'}`}>
                {stats.winRate.toFixed(1)}%
              </div>
              <div className="text-sm text-gray-600">{stats.totalTrades} trades</div>
              <div className="text-sm text-gray-600">${stats.avgPnl.toFixed(2)} avg</div>
            </div>
          ))}
        </div>
      </Card>

      {/* Day of Week Analysis */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance by Day</h3>
        <div className="grid grid-cols-3 md:grid-cols-7 gap-2">
          {['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'].map((day) => {
            const stats = patterns.dayOfWeekAnalysis?.[day];
            return (
              <div key={day} className="p-3 bg-gray-50 rounded-lg text-center">
                <div className="text-xs text-gray-600 capitalize">{day.slice(0, 3)}</div>
                {stats ? (
                  <>
                    <div className={`text-lg font-bold ${stats.winRate >= 50 ? 'text-green-600' : 'text-red-600'}`}>
                      {stats.winRate.toFixed(0)}%
                    </div>
                    <div className="text-xs text-gray-500">{stats.totalTrades}</div>
                  </>
                ) : (
                  <div className="text-gray-400">-</div>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      {/* Streak Analysis */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Streak Analysis</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { key: 'afterWin', label: 'After 1 Win' },
            { key: 'afterLoss', label: 'After 1 Loss' },
            { key: 'after2Losses', label: 'After 2 Losses' },
          ].map(({ key, label }) => {
            const stats = patterns.streakAnalysis?.[key as keyof typeof patterns.streakAnalysis];
            return (
              <div key={key} className="p-4 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-600 mb-2">{label}</div>
                {stats ? (
                  <>
                    <div className={`text-2xl font-bold ${stats.winRate >= 50 ? 'text-green-600' : 'text-red-600'}`}>
                      {stats.winRate.toFixed(1)}%
                    </div>
                    <div className="text-sm text-gray-600">{stats.totalTrades} trades</div>
                  </>
                ) : (
                  <div className="text-gray-400">No data</div>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      {/* All Winning Patterns */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">All Winning Patterns</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="text-left text-xs text-gray-500 uppercase">
                <th className="pb-3">Pattern</th>
                <th className="pb-3 text-right">Win Rate</th>
                <th className="pb-3 text-right">Avg P&L</th>
                <th className="pb-3 text-right">Total P&L</th>
                <th className="pb-3 text-right">Trades</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {patterns.winningPatterns?.map((pattern, idx) => (
                <tr key={idx}>
                  <td className="py-3 font-medium">{pattern.label}</td>
                  <td className="py-3 text-right text-green-600 font-medium">{pattern.winRate.toFixed(1)}%</td>
                  <td className="py-3 text-right">${pattern.avgPnl.toFixed(2)}</td>
                  <td className="py-3 text-right">${pattern.totalPnl.toFixed(2)}</td>
                  <td className="py-3 text-right">{pattern.totalTrades}</td>
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
    return <p className="text-gray-500 text-center py-8">No sentiment data available. Add notes to your trades for analysis.</p>;
  }

  const emotionColors: Record<string, string> = {
    discipline: 'bg-green-500',
    overconfidence: 'bg-red-500',
    fear: 'bg-yellow-500',
    fomo: 'bg-orange-500',
    greed: 'bg-purple-500',
    revenge: 'bg-red-700',
    neutral: 'bg-gray-400',
  };

  return (
    <div className="space-y-6">
      {/* Overall Sentiment */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Overall Sentiment</h3>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-4xl font-bold text-purple-600">{sentiment.overallSentiment.score}/100</div>
            <div className="text-gray-600 capitalize mt-1">
              {sentiment.overallSentiment.label.replace('_', ' ')}
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-600">Trend</div>
            <div className={`text-lg font-medium capitalize ${
              sentiment.trend.trend === 'improving' ? 'text-green-600' :
              sentiment.trend.trend === 'declining' ? 'text-red-600' : 'text-gray-600'
            }`}>
              {sentiment.trend.trend.replace('_', ' ')}
            </div>
          </div>
        </div>
        <div className="mt-4 text-sm text-gray-600">
          Analyzed {sentiment.tradesWithNotes} trades with notes out of {sentiment.tradesAnalyzed} total
        </div>
      </Card>

      {/* Emotion Breakdown */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Emotion Breakdown</h3>
        <div className="space-y-3">
          {Object.entries(sentiment.emotionBreakdown)
            .sort(([, a], [, b]) => b - a)
            .map(([emotion, percentage]) => (
              <div key={emotion} className="flex items-center gap-3">
                <div className="w-24 text-sm text-gray-600 capitalize">{emotion}</div>
                <div className="flex-1 bg-gray-200 rounded-full h-4">
                  <div
                    className={`h-4 rounded-full ${emotionColors[emotion] || 'bg-gray-500'}`}
                    style={{ width: `${Math.min(percentage, 100)}%` }}
                  />
                </div>
                <div className="w-12 text-right text-sm font-medium">{percentage.toFixed(1)}%</div>
              </div>
            ))}
        </div>
      </Card>

      {/* Emotion-Outcome Correlations */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Emotion-Outcome Correlations</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.entries(sentiment.correlations)
            .filter(([_, data]) => data.count >= 2)
            .sort(([, a], [, b]) => b.count - a.count)
            .map(([emotion, data]) => (
              <div key={emotion} className="p-4 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-600 capitalize mb-2">{emotion}</div>
                <div className={`text-2xl font-bold ${data.winRate >= 50 ? 'text-green-600' : 'text-red-600'}`}>
                  {data.winRate.toFixed(1)}%
                </div>
                <div className="text-sm text-gray-600">{data.count} trades</div>
                <div className="text-sm text-gray-600">${data.avgPnl.toFixed(2)} avg</div>
              </div>
            ))}
        </div>
      </Card>
    </div>
  );
}

function RecommendationsTab({ recommendations }: { recommendations: RecommendationsData | null }) {
  if (!recommendations || recommendations.totalCount === 0) {
    return <p className="text-gray-500 text-center py-8">No recommendations available. Keep trading and adding notes for personalized insights.</p>;
  }

  const categoryLabels: Record<string, string> = {
    critical: 'Critical Issues',
    strengths: 'Your Strengths',
    warnings: 'Warnings',
    behavioral: 'Behavioral Improvements',
    insights: 'Insights',
  };

  const categoryColors: Record<string, string> = {
    critical: 'border-red-500 bg-red-50',
    strengths: 'border-green-500 bg-green-50',
    warnings: 'border-yellow-500 bg-yellow-50',
    behavioral: 'border-purple-500 bg-purple-50',
    insights: 'border-blue-500 bg-blue-50',
  };

  return (
    <div className="space-y-6">
      {Object.entries(recommendations.grouped).map(([category, recs]) => {
        if (!recs || recs.length === 0) return null;
        return (
          <Card key={category} className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {categoryLabels[category] || category}
            </h3>
            <div className="space-y-4">
              {recs.map((rec, idx) => (
                <div
                  key={idx}
                  className={`p-4 rounded-lg border-l-4 ${categoryColors[category] || 'border-gray-500 bg-gray-50'}`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-gray-900">{rec.title}</h4>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          rec.priority === 'critical' ? 'bg-red-200 text-red-800' :
                          rec.priority === 'high' ? 'bg-orange-200 text-orange-800' :
                          rec.priority === 'medium' ? 'bg-yellow-200 text-yellow-800' :
                          'bg-gray-200 text-gray-800'
                        }`}>
                          {rec.priority}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{rec.description}</p>
                      <p className="text-sm font-medium text-gray-700 mt-2">
                        <span className="text-gray-500">Action:</span> {rec.action}
                      </p>
                    </div>
                    {rec.metric && (
                      <div className="text-right ml-4 flex-shrink-0">
                        <div className="text-xs text-gray-500">{rec.metric.label}</div>
                        <div className="font-bold text-gray-900 text-lg">{rec.metric.value}</div>
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
