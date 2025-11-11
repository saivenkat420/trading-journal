// Type definitions

export interface Trade {
  id: string;
  symbol: string;
  asset_class: string;
  trade_type: 'long' | 'short';
  position_size: number;
  entry_price: number | null;
  exit_price?: number;
  stop_loss?: number;
  take_profit?: number;
  date: string;
  strategy_id?: string;
  strategy_name?: string;
  strategy_description?: string;
  notes?: string;
  reflection?: string;
  status: 'open' | 'closed' | 'reviewed';
  tags?: Tag[];
  accounts?: Array<{ account_id: string; pnl: number }>;
  session?: string;
  confidence_level?: string;
  // P/L calculation fields
  fees?: number;
  contract_size?: number;
  point_value?: number;
  contract_multiplier?: number;
  face_value?: number;
  interest?: number;
  unit_size?: number;
  created_at: string;
  updated_at: string;
}

export interface Account {
  id: string;
  name: string;
  initial_balance: number;
  current_balance: number;
  created_at: string;
}

export interface Strategy {
  id: string;
  name: string;
  description?: string;
  created_at: string;
  updated_at?: string;
}

export interface Tag {
  id: string;
  name: string;
  color?: string;
  created_at: string;
}

export interface TradingRule {
  id: string;
  name: string;
  description?: string;
  rule_type?: string;
  is_active: boolean;
  created_at: string;
}

export interface Analysis {
  id: string;
  timeframe: string;
  custom_title?: string;
  start_date: string;
  end_date: string;
  major_news_events?: any[];
  symbols_analysis?: any[];
  performance_context?: string;
  created_at: string;
}

export interface Goal {
  id: string;
  month: string;
  profit_goal?: number;
  win_rate_goal?: number;
  account_id?: string | null;
  created_at: string;
}

export interface DashboardStats {
  net_pl: number;
  win_rate: number;
  avg_rr: number;
  average_win: number;
  average_loss: number;
  total_trades: number;
  total_wins: number;
  total_losses: number;
}

