import React, { useState } from 'react';
import { Input, Select, Button } from './index';

interface SearchFiltersProps {
  onSearch: (filters: SearchFilters) => void;
  onReset: () => void;
  className?: string;
}

export interface SearchFilters {
  query?: string;
  status?: string;
  trade_type?: string;
  asset_class?: string;
  date_from?: string;
  date_to?: string;
}

export const SearchFilters: React.FC<SearchFiltersProps> = ({
  onSearch,
  onReset,
  className = '',
}) => {
  const [filters, setFilters] = useState<SearchFilters>({});
  const [isExpanded, setIsExpanded] = useState(false);

  const handleChange = (field: keyof SearchFilters, value: any) => {
    setFilters((prev) => ({ ...prev, [field]: value || undefined }));
  };

  const handleSearch = () => {
    onSearch(filters);
  };

  const handleReset = () => {
    setFilters({});
    onReset();
    setIsExpanded(false);
  };

  return (
    <div className={`bg-dark-bg-secondary rounded-lg border border-dark-border-primary p-4 ${className}`}>
      <div className="flex items-center gap-4 mb-4">
        <div className="flex-1">
          <Input
            placeholder="Search by symbol, notes, or reflection..."
            value={filters.query || ''}
            onChange={(e) => handleChange('query', e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          />
        </div>
        <Button onClick={handleSearch}>Search</Button>
        <Button variant="secondary" onClick={handleReset}>
          Reset
        </Button>
        <Button
          variant="outline"
          onClick={() => setIsExpanded(!isExpanded)}
          className="whitespace-nowrap"
        >
          {isExpanded ? 'Less Filters' : 'More Filters'}
        </Button>
      </div>

      {isExpanded && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-dark-border-primary">
          <Select
            label="Status"
            value={filters.status || ''}
            onChange={(e) => handleChange('status', e.target.value)}
            options={[
              { value: '', label: 'All Statuses' },
              { value: 'open', label: 'Open' },
              { value: 'closed', label: 'Closed' },
              { value: 'reviewed', label: 'Reviewed' },
            ]}
          />

          <Select
            label="Trade Type"
            value={filters.trade_type || ''}
            onChange={(e) => handleChange('trade_type', e.target.value)}
            options={[
              { value: '', label: 'All Types' },
              { value: 'long', label: 'Long' },
              { value: 'short', label: 'Short' },
            ]}
          />

          <Select
            label="Asset Class"
            value={filters.asset_class || ''}
            onChange={(e) => handleChange('asset_class', e.target.value)}
            options={[
              { value: '', label: 'All Classes' },
              { value: 'futures', label: 'Futures' },
              { value: 'forex', label: 'Forex' },
              { value: 'stocks', label: 'Stocks' },
              { value: 'crypto', label: 'Crypto' },
            ]}
          />

          <Input
            label="Date From"
            type="date"
            value={filters.date_from || ''}
            onChange={(e) => handleChange('date_from', e.target.value)}
          />

          <Input
            label="Date To"
            type="date"
            value={filters.date_to || ''}
            onChange={(e) => handleChange('date_to', e.target.value)}
          />
        </div>
      )}
    </div>
  );
};

