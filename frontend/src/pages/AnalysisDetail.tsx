import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { analysisApi } from '../utils/api';
import { Analysis } from '../types';
import { Card, Button, LoadingSpinner, ErrorMessage } from '../components';

function AnalysisDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      loadAnalysis();
    }
  }, [id]);

  const loadAnalysis = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await analysisApi.getById(id!);
      setAnalysis(res.data.data);
    } catch (err: any) {
      console.error('Error loading analysis:', err);
      setError(err?.response?.data?.error?.message || 'Failed to load analysis');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error || !analysis) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-dark-text-primary mb-2">Analysis Details</h1>
          </div>
          <Button variant="secondary" onClick={() => navigate('/analysis')} className="w-full sm:w-auto">
            Back to Analysis
          </Button>
        </div>
        <Card>
          <ErrorMessage message={error || 'Analysis not found'} />
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-dark-text-primary mb-2">
            {analysis.custom_title ||
              `${analysis.timeframe.charAt(0).toUpperCase() + analysis.timeframe.slice(1)} Analysis`}
          </h1>
          <p className="text-sm sm:text-base text-dark-text-secondary">
            {new Date(analysis.start_date).toLocaleDateString()} -{' '}
            {new Date(analysis.end_date).toLocaleDateString()}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" onClick={() => navigate('/analysis')} className="w-full sm:w-auto">
            Back
          </Button>
          <Button onClick={() => alert('Edit feature coming soon!')} className="w-full sm:w-auto">
            Edit
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Performance Context */}
          {analysis.performance_context && (
            <Card title="Performance Context">
              <div className="prose prose-invert max-w-none">
                <p className="text-dark-text-primary whitespace-pre-wrap">
                  {analysis.performance_context}
                </p>
              </div>
            </Card>
          )}

          {/* Major News Events */}
          {analysis.major_news_events && analysis.major_news_events.length > 0 && (
            <Card title="Major News Events">
              <div className="space-y-4">
                {analysis.major_news_events.map((event: any, index: number) => (
                  <div
                    key={index}
                    className="p-4 bg-dark-bg-tertiary rounded-lg border border-dark-border-primary"
                  >
                    {typeof event === 'string' ? (
                      <p className="text-dark-text-primary">{event}</p>
                    ) : (
                      <>
                        {event.date && (
                          <p className="text-sm text-dark-text-secondary mb-1">
                            {new Date(event.date).toLocaleDateString()}
                          </p>
                        )}
                        {event.title && (
                          <h4 className="text-lg font-semibold text-dark-text-primary mb-2">
                            {event.title}
                          </h4>
                        )}
                        {event.description && (
                          <p className="text-dark-text-secondary">{event.description}</p>
                        )}
                        {event.impact && (
                          <p className="text-sm text-dark-text-tertiary mt-2">
                            Impact: {event.impact}
                          </p>
                        )}
                      </>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Symbols Analysis */}
          {analysis.symbols_analysis && analysis.symbols_analysis.length > 0 && (
            <Card title="Symbols Analysis">
              <div className="overflow-x-auto -mx-4 sm:mx-0">
                <table className="w-full min-w-[500px]">
                  <thead>
                    <tr className="border-b border-dark-border-primary">
                      <th className="text-left py-3 px-2 sm:px-4 text-xs sm:text-sm font-semibold text-dark-text-secondary">
                        Symbol
                      </th>
                      <th className="text-left py-3 px-2 sm:px-4 text-xs sm:text-sm font-semibold text-dark-text-secondary">
                        Analysis
                      </th>
                      <th className="text-left py-3 px-2 sm:px-4 text-xs sm:text-sm font-semibold text-dark-text-secondary">
                        Outlook
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {analysis.symbols_analysis.map((symbolAnalysis: any, index: number) => (
                      <tr
                        key={index}
                        className="border-b border-dark-border-primary hover:bg-dark-bg-tertiary"
                      >
                        <td className="py-3 px-2 sm:px-4">
                          <span className="font-medium text-dark-text-primary text-xs sm:text-sm">
                            {typeof symbolAnalysis === 'string'
                              ? symbolAnalysis
                              : symbolAnalysis.symbol || symbolAnalysis.name}
                          </span>
                        </td>
                        <td className="py-3 px-2 sm:px-4 text-dark-text-secondary text-xs sm:text-sm">
                          {typeof symbolAnalysis === 'string'
                            ? '-'
                            : symbolAnalysis.analysis || symbolAnalysis.notes || '-'}
                        </td>
                        <td className="py-3 px-2 sm:px-4">
                          {typeof symbolAnalysis === 'string' ? (
                            '-'
                          ) : symbolAnalysis.outlook ? (
                            <span
                              className={`px-2 py-1 rounded text-xs font-medium ${
                                symbolAnalysis.outlook === 'bullish'
                                  ? 'bg-green-500/20 text-green-400'
                                  : symbolAnalysis.outlook === 'bearish'
                                  ? 'bg-red-500/20 text-red-400'
                                  : 'bg-dark-bg-tertiary text-dark-text-secondary'
                              }`}
                            >
                              {symbolAnalysis.outlook}
                            </span>
                          ) : (
                            '-'
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card title="Analysis Info">
            <div className="space-y-4">
              <div>
                <p className="text-sm text-dark-text-secondary mb-1">Timeframe</p>
                <span
                  className={`inline-block px-3 py-1 rounded text-sm font-medium ${
                    analysis.timeframe === 'weekly'
                      ? 'bg-blue-500/20 text-blue-400'
                      : analysis.timeframe === 'monthly'
                      ? 'bg-purple-500/20 text-purple-400'
                      : 'bg-dark-bg-tertiary text-dark-text-secondary'
                  }`}
                >
                  {analysis.timeframe}
                </span>
              </div>
              <div>
                <p className="text-sm text-dark-text-secondary mb-1">Start Date</p>
                <p className="text-dark-text-primary">
                  {new Date(analysis.start_date).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              </div>
              <div>
                <p className="text-sm text-dark-text-secondary mb-1">End Date</p>
                <p className="text-dark-text-primary">
                  {new Date(analysis.end_date).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              </div>
              <div>
                <p className="text-sm text-dark-text-secondary mb-1">Created</p>
                <p className="text-dark-text-primary">
                  {new Date(analysis.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default AnalysisDetail;

