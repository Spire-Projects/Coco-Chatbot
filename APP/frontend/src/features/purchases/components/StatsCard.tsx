import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/shared/components/ui/card';

interface StatsCardProps {
  title: string;
  value: number | string;
  icon: LucideIcon;
  color: 'blue' | 'green' | 'purple' | 'orange' | 'red' | 'yellow' | 'teal';
  loading?: boolean;
}

const colorMap = {
  blue: {
    border: 'border-blue-100 hover:border-blue-200',
    bg: 'bg-blue-50',
    text: 'text-blue-600'
  },
  green: {
    border: 'border-green-100 hover:border-green-200',
    bg: 'bg-green-50',
    text: 'text-green-600'
  },
  purple: {
    border: 'border-purple-100 hover:border-purple-200',
    bg: 'bg-purple-50',
    text: 'text-purple-600'
  },
  orange: {
    border: 'border-orange-100 hover:border-orange-200',
    bg: 'bg-orange-50',
    text: 'text-orange-600'
  },
  red: {
    border: 'border-red-100 hover:border-red-200',
    bg: 'bg-red-50',
    text: 'text-red-600'
  },
  yellow: {
    border: 'border-yellow-100 hover:border-yellow-200',
    bg: 'bg-yellow-50',
    text: 'text-yellow-600'
  },
  teal: {
    border: 'border-teal-100 hover:border-teal-200',
    bg: 'bg-teal-50',
    text: 'text-teal-600'
  }
};

export const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  icon: Icon,
  color,
  loading = false
}) => {
  const colorClasses = colorMap[color];
  
  return (
    <Card className={`p-0 lg:p-3 transition-all duration-200 hover:shadow-md ${colorClasses.border}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">{title}</p>
            {loading ? (
              <div className="flex items-center mt-1">
                <Loader2 className="h-5 w-5 animate-spin text-gray-400 mr-2" />
                <span className="text-lg text-gray-400">Cargando...</span>
              </div>
            ) : (
              <p className="text-2xl font-bold text-gray-900">{value}</p>
            )}
          </div>
          <div className={`p-2 rounded-full ${colorClasses.bg}`}>
            <Icon className={`h-6 w-6 ${colorClasses.text}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default StatsCard;
