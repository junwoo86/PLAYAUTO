import React from 'react';
import { LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface ChartCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  color?: 'blue' | 'green' | 'red' | 'yellow' | 'purple' | 'gray' | 'teal';
  trend?: {
    value: number;
    type: 'increase' | 'decrease' | 'neutral';
  };
  children?: React.ReactNode; // 차트 컴포넌트를 넣을 수 있도록
  loading?: boolean;
  actions?: React.ReactNode; // 우측 상단 액션 버튼들
  hasData?: boolean; // 데이터 존재 여부 추가
}

const colorClasses = {
  blue: 'text-blue-600',
  green: 'text-green-600',
  red: 'text-red-600',
  yellow: 'text-yellow-600',
  purple: 'text-purple-600',
  gray: 'text-gray-600',
  teal: 'text-teal-600'
};

export function ChartCard({
  title,
  value,
  subtitle,
  icon: Icon,
  color = 'blue',
  trend,
  children,
  loading = false,
  actions,
  hasData = true
}: ChartCardProps) {
  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6 animate-pulse">
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1">
            <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
            <div className="h-6 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
        <div className="h-40 bg-gray-200 rounded"></div>
      </div>
    );
  }

  const TrendIcon = trend?.type === 'increase' ? TrendingUp : 
                    trend?.type === 'decrease' ? TrendingDown : Minus;

  return (
    <div className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow">
      <div className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              {Icon && <Icon size={20} className="text-gray-500" />}
              <h4 className="text-sm font-medium text-gray-700">{title}</h4>
            </div>
            <p className={`text-2xl font-bold ${colorClasses[color]}`}>{value}</p>
            {subtitle && (
              <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
            )}
            {trend && (
              <div className={`flex items-center gap-1 mt-2 text-sm ${
                trend.type === 'increase' ? 'text-green-600' : 
                trend.type === 'decrease' ? 'text-red-600' : 
                'text-gray-500'
              }`}>
                <TrendIcon size={16} />
                <span>{Math.abs(trend.value)}%</span>
              </div>
            )}
          </div>
          {actions && (
            <div className="flex items-center gap-2">
              {actions}
            </div>
          )}
        </div>
        
        {children && (
          <div className="mt-4">
            {children}
          </div>
        )}
      </div>
    </div>
  );
}

// 간단한 막대 차트 컴포넌트
interface SimpleBarChartProps {
  data: Array<{
    label: string;
    value: number;
    color?: string;
  }>;
  height?: number;
}

export function SimpleBarChart({ data, height = 160 }: SimpleBarChartProps) {
  const maxValue = Math.max(...data.map(d => d.value));
  
  return (
    <div className="flex items-end justify-around" style={{ height }}>
      {data.map((item, index) => (
        <div key={index} className="flex flex-col items-center flex-1 mx-1">
          <div 
            className="w-full bg-gradient-to-t from-blue-500 to-blue-400 rounded-t hover:from-blue-600 hover:to-blue-500 transition-colors"
            style={{
              height: `${(item.value / maxValue) * 100}%`,
              backgroundColor: item.color || undefined,
              minHeight: '4px'
            }}
          />
          <span className="text-xs text-gray-500 mt-2">{item.label}</span>
        </div>
      ))}
    </div>
  );
}

// 미니 라인 차트 (SVG 기반)
interface MiniLineChartProps {
  data: number[];
  color?: string;
  height?: number;
  width?: number;
}

export function MiniLineChart({ 
  data, 
  color = '#14B8A6',
  height = 40,
  width = 100 
}: MiniLineChartProps) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  
  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * width;
    const y = height - ((value - min) / range) * height;
    return `${x},${y}`;
  }).join(' ');
  
  const areaPoints = `0,${height} ${points} ${width},${height}`;
  
  return (
    <svg width={width} height={height} className="overflow-visible">
      {/* 영역 */}
      <polygon
        points={areaPoints}
        fill={color}
        fillOpacity="0.1"
      />
      {/* 선 */}
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* 점들 */}
      {data.map((value, index) => {
        const x = (index / (data.length - 1)) * width;
        const y = height - ((value - min) / range) * height;
        return (
          <circle
            key={index}
            cx={x}
            cy={y}
            r="2"
            fill={color}
          />
        );
      })}
    </svg>
  );
}