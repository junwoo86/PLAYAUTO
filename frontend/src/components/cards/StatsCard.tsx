import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatItem {
  label: string;
  value: string | number;
  change?: {
    value: number;
    type: 'increase' | 'decrease' | 'neutral';
  };
}

interface StatsCardProps {
  title: string;
  value: string | number;
  icon?: LucideIcon;
  color?: 'blue' | 'green' | 'red' | 'yellow' | 'purple' | 'gray' | 'teal';
  subStats?: StatItem[];
  trend?: {
    value: number;
    label: string;
  };
  loading?: boolean;
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

const bgColorClasses = {
  blue: 'bg-blue-50',
  green: 'bg-green-50',
  red: 'bg-red-50',
  yellow: 'bg-yellow-50',
  purple: 'bg-purple-50',
  gray: 'bg-gray-50',
  teal: 'bg-teal-50'
};

export function StatsCard({
  title,
  value,
  icon: Icon,
  color = 'blue',
  subStats = [],
  trend,
  loading = false
}: StatsCardProps) {
  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-1/3 mb-3"></div>
        <div className="h-8 bg-gray-200 rounded w-2/3 mb-4"></div>
        <div className="space-y-2">
          <div className="h-3 bg-gray-200 rounded w-full"></div>
          <div className="h-3 bg-gray-200 rounded w-4/5"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-sm font-medium text-gray-500 mb-2">{title}</h3>
          <p className={`text-3xl font-bold ${colorClasses[color]}`}>{value}</p>
          
          {trend && (
            <div className="flex items-center mt-2">
              <span className={`text-sm font-medium ${trend.value >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {trend.value >= 0 ? '+' : ''}{trend.value}%
              </span>
              <span className="text-sm text-gray-500 ml-2">{trend.label}</span>
            </div>
          )}
        </div>
        
        {Icon && (
          <div className={`p-3 rounded-lg ${bgColorClasses[color]}`}>
            <Icon size={24} className={colorClasses[color]} />
          </div>
        )}
      </div>
      
      {subStats.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-100 space-y-2 text-sm">
          {subStats.map((stat, idx) => (
            <div key={idx} className="flex justify-between items-center">
              <span className="text-gray-500">{stat.label}</span>
              <div className="flex items-center gap-2">
                <span className="text-gray-700 font-medium">{stat.value}</span>
                {stat.change && (
                  <span className={`text-xs ${
                    stat.change.type === 'increase' ? 'text-green-600' : 
                    stat.change.type === 'decrease' ? 'text-red-600' : 
                    'text-gray-500'
                  }`}>
                    {stat.change.type === 'increase' ? '↑' : 
                     stat.change.type === 'decrease' ? '↓' : '→'}
                    {Math.abs(stat.change.value)}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// 미니 통계 카드 컴포넌트
interface MiniStatsCardProps {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
}

export function MiniStatsCard({
  label,
  value,
  icon: Icon,
  trend,
  trendValue
}: MiniStatsCardProps) {
  const trendColors = {
    up: 'text-green-600',
    down: 'text-red-600',
    neutral: 'text-gray-500'
  };
  
  const trendIcons = {
    up: '↑',
    down: '↓',
    neutral: '→'
  };
  
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
          <p className="text-xl font-semibold text-gray-900 mt-1">{value}</p>
          {trend && trendValue && (
            <p className={`text-xs mt-1 ${trendColors[trend]}`}>
              <span>{trendIcons[trend]}</span>
              <span className="ml-1">{trendValue}</span>
            </p>
          )}
        </div>
        {Icon && (
          <Icon size={20} className="text-gray-400" />
        )}
      </div>
    </div>
  );
}