import React from 'react';

interface ChartProps {
  type: 'line' | 'bar' | 'pie' | 'area';
  data: any[];
  height?: number;
  className?: string;
}

// Simple chart component using SVG (can be replaced with Chart.js or Recharts later)
export const Chart: React.FC<ChartProps> = ({
  type,
  data,
  height = 300,
  className = '',
}) => {
  // For now, return a placeholder that can be replaced with a real charting library
  // This is a simple SVG-based chart implementation
  if (data.length === 0) {
    return (
      <div
        className={`flex items-center justify-center bg-dark-bg-tertiary rounded-lg border border-dark-border-primary ${className}`}
        style={{ height: `${height}px` }}
      >
        <p className="text-dark-text-secondary">No data available</p>
      </div>
    );
  }

  // Simple line/area chart implementation
  if (type === 'line' || type === 'area') {
    const maxValue = Math.max(...data.map((d) => d.value || 0));
    const minValue = Math.min(...data.map((d) => d.value || 0));
    const range = maxValue - minValue || 1;
    const width = 800;
    const chartHeight = height - 60;
    const padding = 40;

    const points = data.map((d, i) => {
      const x = padding + (i / (data.length - 1 || 1)) * (width - 2 * padding);
      const y =
        padding +
        chartHeight -
        ((d.value - minValue) / range) * chartHeight;
      return { x, y, value: d.value, label: d.label || d.date || '' };
    });

    const pathData = points
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
      .join(' ');

    const areaPathData =
      pathData +
      ` L ${points[points.length - 1].x} ${height - padding} L ${padding} ${height - padding} Z`;

    return (
      <div className={`bg-dark-bg-secondary rounded-lg p-4 ${className}`}>
        <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
            const y = padding + chartHeight * (1 - ratio);
            const value = minValue + range * ratio;
            return (
              <g key={ratio}>
                <line
                  x1={padding}
                  y1={y}
                  x2={width - padding}
                  y2={y}
                  stroke="#333333"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                />
                <text
                  x={padding - 10}
                  y={y + 4}
                  fill="#999999"
                  fontSize="12"
                  textAnchor="end"
                >
                  {value.toFixed(0)}
                </text>
              </g>
            );
          })}

          {/* Area fill (for area chart) */}
          {type === 'area' && (
            <path
              d={areaPathData}
              fill="url(#gradient)"
              opacity="0.3"
            />
          )}

          {/* Line */}
          <path
            d={pathData}
            fill="none"
            stroke="#3b82f6"
            strokeWidth="2"
          />

          {/* Data points */}
          {points.map((point, i) => (
            <g key={i}>
              <circle
                cx={point.x}
                cy={point.y}
                r="4"
                fill="#3b82f6"
              />
              <title>{`${point.label}: ${point.value}`}</title>
            </g>
          ))}

          {/* X-axis labels */}
          {points
            .filter((_, i) => i % Math.ceil(data.length / 5) === 0 || i === data.length - 1)
            .map((point, i) => (
              <text
                key={i}
                x={point.x}
                y={height - padding + 20}
                fill="#999999"
                fontSize="11"
                textAnchor="middle"
              >
                {point.label}
              </text>
            ))}

          {/* Gradient definition */}
          <defs>
            <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    );
  }

  // Bar chart
  if (type === 'bar') {
    const maxValue = Math.max(...data.map((d) => d.value || 0));
    const width = 800;
    const chartHeight = height - 60;
    const padding = 40;
    const barWidth = (width - 2 * padding) / data.length - 10;

    return (
      <div className={`bg-dark-bg-secondary rounded-lg p-4 ${className}`}>
        <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
            const y = padding + chartHeight * (1 - ratio);
            const value = maxValue * ratio;
            return (
              <g key={ratio}>
                <line
                  x1={padding}
                  y1={y}
                  x2={width - padding}
                  y2={y}
                  stroke="#333333"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                />
                <text
                  x={padding - 10}
                  y={y + 4}
                  fill="#999999"
                  fontSize="12"
                  textAnchor="end"
                >
                  {value.toFixed(0)}
                </text>
              </g>
            );
          })}

          {/* Bars */}
          {data.map((d, i) => {
            const barHeight = ((d.value || 0) / maxValue) * chartHeight;
            const x = padding + i * (barWidth + 10);
            const y = padding + chartHeight - barHeight;
            const isPositive = (d.value || 0) >= 0;

            return (
              <g key={i}>
                <rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={barHeight}
                  fill={isPositive ? '#22c55e' : '#ef4444'}
                  opacity="0.8"
                />
                <text
                  x={x + barWidth / 2}
                  y={y - 5}
                  fill="#ffffff"
                  fontSize="11"
                  textAnchor="middle"
                >
                  {d.value?.toFixed(0)}
                </text>
                <text
                  x={x + barWidth / 2}
                  y={height - padding + 20}
                  fill="#999999"
                  fontSize="11"
                  textAnchor="middle"
                >
                  {d.label || d.date || ''}
                </text>
                <title>{`${d.label || d.date}: ${d.value}`}</title>
              </g>
            );
          })}
        </svg>
      </div>
    );
  }

  // Pie chart
  if (type === 'pie') {
    const total = data.reduce((sum, d) => sum + (d.value || 0), 0);
    let currentAngle = 0;
    const radius = Math.min(height - 100, 200) / 2;
    const centerX = 400;
    const centerY = height / 2;

    const colors = [
      '#3b82f6',
      '#22c55e',
      '#ef4444',
      '#f59e0b',
      '#8b5cf6',
      '#ec4899',
    ];

    return (
      <div className={`bg-dark-bg-secondary rounded-lg p-4 ${className}`}>
        <svg width="100%" height={height} viewBox={`0 0 800 ${height}`}>
          {data.map((d, i) => {
            const value = d.value || 0;
            const percentage = (value / total) * 100;
            const angle = (value / total) * 360;
            const startAngle = currentAngle;
            const endAngle = currentAngle + angle;
            currentAngle += angle;

            const startAngleRad = (startAngle * Math.PI) / 180;
            const endAngleRad = (endAngle * Math.PI) / 180;

            const x1 = centerX + radius * Math.cos(startAngleRad);
            const y1 = centerY + radius * Math.sin(startAngleRad);
            const x2 = centerX + radius * Math.cos(endAngleRad);
            const y2 = centerY + radius * Math.sin(endAngleRad);

            const largeArc = angle > 180 ? 1 : 0;

            const pathData = [
              `M ${centerX} ${centerY}`,
              `L ${x1} ${y1}`,
              `A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`,
              'Z',
            ].join(' ');

            return (
              <g key={i}>
                <path
                  d={pathData}
                  fill={colors[i % colors.length]}
                  opacity="0.8"
                />
                <title>{`${d.label}: ${value} (${percentage.toFixed(1)}%)`}</title>
              </g>
            );
          })}

          {/* Legend */}
          {data.map((d, i) => {
            const y = 50 + i * 25;
            return (
              <g key={i}>
                <rect x={600} y={y - 10} width={15} height={15} fill={colors[i % colors.length]} />
                <text x={625} y={y} fill="#ffffff" fontSize="12">
                  {d.label}: {((d.value || 0) / total * 100).toFixed(1)}%
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    );
  }

  return null;
};

