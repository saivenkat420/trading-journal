import { useState, useEffect } from 'react';
import { aiApi } from '../utils/api';

interface PredictionData {
  winProbability: number;
  confidenceLevel: string;
  riskLevel: string;
  factors: Array<{
    name: string;
    impact: number;
    direction: string;
  }>;
  similarTrades: {
    total: number;
    wins: number;
    losses: number;
    winRate: number;
    avgPnl: number;
  };
  modelAccuracy: number;
  trainedOnTrades: number;
}

interface PredictionWidgetProps {
  tradeData: {
    session?: string;
    trade_type?: string;
    asset_class?: string;
    confidence_level?: string;
    date?: string;
  };
}

export default function PredictionWidget({ tradeData }: PredictionWidgetProps) {
  const [prediction, setPrediction] = useState<PredictionData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(true);

  const canPredict = tradeData.session && tradeData.trade_type;

  useEffect(() => {
    const fetchPrediction = async () => {
      if (!canPredict) {
        setPrediction(null);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const response = await aiApi.predict({
          session: tradeData.session,
          trade_type: tradeData.trade_type,
          asset_class: tradeData.asset_class || 'other',
          confidence_level: tradeData.confidence_level || 'average',
          date: tradeData.date || new Date().toISOString(),
        });

        if (response.data.success) {
          setPrediction(response.data.data);
        } else {
          setError(response.data.message || 'Unable to make prediction');
          setPrediction(null);
        }
      } catch (err: any) {
        setError(err.response?.data?.message || 'Prediction unavailable');
        setPrediction(null);
      } finally {
        setLoading(false);
      }
    };

    const debounceTimer = setTimeout(fetchPrediction, 500);
    return () => clearTimeout(debounceTimer);
  }, [tradeData.session, tradeData.trade_type, tradeData.asset_class, tradeData.confidence_level, canPredict]);

  if (!canPredict) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <div className="flex items-center gap-2 text-gray-500">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          <span className="text-sm">Select session and trade type to see AI prediction</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-blue-100/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          <span className="font-medium text-gray-900">AI Win Prediction</span>
        </div>
        <div className="flex items-center gap-2">
          {loading && (
            <svg className="animate-spin h-4 w-4 text-blue-600" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          )}
          {prediction && !loading && (
            <span className={`text-lg font-bold ${
              prediction.winProbability >= 0.6 ? 'text-green-600' :
              prediction.winProbability <= 0.4 ? 'text-red-600' : 'text-yellow-600'
            }`}>
              {(prediction.winProbability * 100).toFixed(0)}%
            </span>
          )}
          <svg
            className={`w-5 h-5 text-gray-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Content */}
      {isExpanded && (
        <div className="px-4 pb-4">
          {loading && !prediction && (
            <div className="text-center py-4 text-gray-500">
              <svg className="animate-spin h-6 w-6 mx-auto text-blue-600" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <p className="mt-2 text-sm">Analyzing...</p>
            </div>
          )}

          {error && (
            <div className="text-center py-4 text-gray-500 text-sm">
              {error}
            </div>
          )}

          {prediction && (
            <div className="space-y-4">
              {/* Win Probability */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Win Probability</span>
                  <span className={`font-bold ${
                    prediction.winProbability >= 0.6 ? 'text-green-600' :
                    prediction.winProbability <= 0.4 ? 'text-red-600' : 'text-yellow-600'
                  }`}>
                    {(prediction.winProbability * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      prediction.winProbability >= 0.6 ? 'bg-green-500' :
                      prediction.winProbability <= 0.4 ? 'bg-red-500' : 'bg-yellow-500'
                    }`}
                    style={{ width: `${prediction.winProbability * 100}%` }}
                  />
                </div>
              </div>

              {/* Confidence and Risk */}
              <div className="flex gap-4">
                <div className="flex-1 bg-white rounded-lg p-3 text-center">
                  <div className="text-xs text-gray-500">Confidence</div>
                  <div className={`font-semibold capitalize ${
                    prediction.confidenceLevel === 'high' ? 'text-green-600' :
                    prediction.confidenceLevel === 'low' ? 'text-red-600' : 'text-yellow-600'
                  }`}>
                    {prediction.confidenceLevel}
                  </div>
                </div>
                <div className="flex-1 bg-white rounded-lg p-3 text-center">
                  <div className="text-xs text-gray-500">Risk Level</div>
                  <div className={`font-semibold capitalize ${
                    prediction.riskLevel === 'low' ? 'text-green-600' :
                    prediction.riskLevel === 'high' ? 'text-red-600' : 'text-yellow-600'
                  }`}>
                    {prediction.riskLevel}
                  </div>
                </div>
              </div>

              {/* Contributing Factors */}
              {prediction.factors && prediction.factors.length > 0 && (
                <div>
                  <div className="text-sm text-gray-600 mb-2">Contributing Factors</div>
                  <div className="space-y-1">
                    {prediction.factors.map((factor, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-sm">
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${
                          factor.direction === 'positive' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                        }`}>
                          {factor.direction === 'positive' ? '+' : '-'}
                        </span>
                        <span className="text-gray-700">{factor.name}</span>
                        <span className={`ml-auto font-medium ${
                          factor.direction === 'positive' ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {factor.direction === 'positive' ? '+' : ''}{(factor.impact * 100).toFixed(0)}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Similar Trades */}
              {prediction.similarTrades && prediction.similarTrades.total > 0 && (
                <div className="bg-white rounded-lg p-3">
                  <div className="text-sm text-gray-600 mb-1">Similar Historical Trades</div>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-gray-700">{prediction.similarTrades.total} trades</span>
                    <span className="text-green-600">{prediction.similarTrades.wins} wins</span>
                    <span className="text-red-600">{prediction.similarTrades.losses} losses</span>
                    <span className="ml-auto font-medium">
                      {prediction.similarTrades.winRate.toFixed(0)}% win rate
                    </span>
                  </div>
                </div>
              )}

              {/* Model Info */}
              <div className="text-xs text-gray-400 text-center">
                Model accuracy: {prediction.modelAccuracy}% • Trained on {prediction.trainedOnTrades} trades
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
