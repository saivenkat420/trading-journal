import { useEffect, useState } from "react";
import { analyticsApi } from "../utils/api";
import { Card, LoadingSpinner } from "../components";

function Insights() {
  const [insights, setInsights] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadInsights();
  }, []);

  const loadInsights = async () => {
    try {
      const res = await analyticsApi.getInsights();
      setInsights(res.data.data);
    } catch (error) {
      console.error("Error loading insights:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(value);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!insights || insights.by_symbol?.length === 0) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-dark-text-primary mb-2">
            Insights
          </h1>
          <p className="text-sm sm:text-base text-dark-text-secondary">
            Trading performance insights and analytics
          </p>
        </div>
        <Card>
          <div className="text-center py-12">
            <p className="text-dark-text-secondary mb-4">
              No data for analysis. Add some trades to see insights.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-dark-text-primary mb-2">
          Insights
        </h1>
        <p className="text-sm sm:text-base text-dark-text-secondary">
          Trading performance insights and analytics
        </p>
      </div>

      {/* Performance by Symbol */}
      <Card title="Performance by Symbol">
        <div className="overflow-x-auto custom-scrollbar -mx-4 sm:mx-0">
          <table className="w-full min-w-[700px]">
            <thead>
              <tr className="border-b border-dark-border-primary">
                <th className="text-left py-3 px-2 sm:px-4 text-xs sm:text-sm font-semibold text-dark-text-secondary uppercase tracking-wider">
                  Symbol
                </th>
                <th className="text-left py-3 px-2 sm:px-4 text-xs sm:text-sm font-semibold text-dark-text-secondary uppercase tracking-wider hidden md:table-cell">
                  Asset Class
                </th>
                <th className="text-left py-3 px-2 sm:px-4 text-xs sm:text-sm font-semibold text-dark-text-secondary uppercase tracking-wider">
                  Trades
                </th>
                <th className="text-left py-3 px-2 sm:px-4 text-xs sm:text-sm font-semibold text-dark-text-secondary uppercase tracking-wider">
                  Total P&L
                </th>
                <th className="text-left py-3 px-2 sm:px-4 text-xs sm:text-sm font-semibold text-dark-text-secondary uppercase tracking-wider hidden lg:table-cell">
                  Avg P&L
                </th>
                <th className="text-left py-3 px-2 sm:px-4 text-xs sm:text-sm font-semibold text-dark-text-secondary uppercase tracking-wider hidden sm:table-cell">
                  Wins
                </th>
                <th className="text-left py-3 px-2 sm:px-4 text-xs sm:text-sm font-semibold text-dark-text-secondary uppercase tracking-wider hidden sm:table-cell">
                  Losses
                </th>
              </tr>
            </thead>
            <tbody>
              {insights.by_symbol?.map((item: any, idx: number) => {
                const totalPnl = parseFloat(item.total_pnl || 0);
                const avgPnl = parseFloat(item.avg_pnl || 0);
                return (
                  <tr
                    key={idx}
                    className="border-b border-dark-border-primary hover:bg-dark-bg-tertiary transition-colors duration-150"
                  >
                    <td className="py-3 px-2 sm:px-4">
                      <span className="font-medium text-dark-text-primary text-xs sm:text-sm">
                        {item.symbol}
                      </span>
                    </td>
                    <td className="py-3 px-2 sm:px-4 text-dark-text-secondary capitalize text-xs sm:text-sm hidden md:table-cell">
                      {item.asset_class}
                    </td>
                    <td className="py-3 px-2 sm:px-4 text-dark-text-primary text-xs sm:text-sm">
                      {item.trade_count}
                    </td>
                    <td
                      className={`py-3 px-2 sm:px-4 font-medium text-xs sm:text-sm ${
                        totalPnl > 0
                          ? "text-dark-accent-success"
                          : totalPnl < 0
                          ? "text-dark-accent-danger"
                          : "text-dark-text-primary"
                      }`}
                    >
                      {formatCurrency(totalPnl)}
                    </td>
                    <td
                      className={`py-3 px-2 sm:px-4 text-xs sm:text-sm hidden lg:table-cell ${
                        avgPnl > 0
                          ? "text-dark-accent-success"
                          : avgPnl < 0
                          ? "text-dark-accent-danger"
                          : "text-dark-text-primary"
                      }`}
                    >
                      {formatCurrency(avgPnl)}
                    </td>
                    <td className="py-3 px-2 sm:px-4 text-dark-accent-success text-xs sm:text-sm hidden sm:table-cell">
                      {item.wins}
                    </td>
                    <td className="py-3 px-2 sm:px-4 text-dark-accent-danger text-xs sm:text-sm hidden sm:table-cell">
                      {item.losses}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Best and Worst Trades */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
        {insights.best_trade && (
          <Card title="Best Trade">
            <div className="space-y-3">
              <div>
                <p className="text-sm text-dark-text-secondary mb-1">Symbol</p>
                <p className="text-lg font-semibold text-dark-text-primary">
                  {insights.best_trade.symbol}
                </p>
              </div>
              <div>
                <p className="text-sm text-dark-text-secondary mb-1">
                  Total P&L
                </p>
                <p className="text-2xl font-bold text-dark-accent-success">
                  {formatCurrency(
                    parseFloat(insights.best_trade.total_pnl || 0)
                  )}
                </p>
              </div>
              <div>
                <p className="text-sm text-dark-text-secondary mb-1">Date</p>
                <p className="text-dark-text-primary">
                  {new Date(insights.best_trade.date).toLocaleDateString()}
                </p>
              </div>
            </div>
          </Card>
        )}

        {insights.worst_trade && (
          <Card title="Worst Trade">
            <div className="space-y-3">
              <div>
                <p className="text-sm text-dark-text-secondary mb-1">Symbol</p>
                <p className="text-lg font-semibold text-dark-text-primary">
                  {insights.worst_trade.symbol}
                </p>
              </div>
              <div>
                <p className="text-sm text-dark-text-secondary mb-1">
                  Total P&L
                </p>
                <p className="text-2xl font-bold text-dark-accent-danger">
                  {formatCurrency(
                    parseFloat(insights.worst_trade.total_pnl || 0)
                  )}
                </p>
              </div>
              <div>
                <p className="text-sm text-dark-text-secondary mb-1">Date</p>
                <p className="text-dark-text-primary">
                  {new Date(insights.worst_trade.date).toLocaleDateString()}
                </p>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

export default Insights;
