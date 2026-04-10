import { memo } from 'react';
import { Eye, Lock } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/components/ui/popover';
import { Button } from '@/shared/components/ui/button';
import type { GraphPattern } from '../types/modelTypes/Reparation';

interface PasswordDisplayProps {
  password?: string | GraphPattern;
}

const PasswordDisplay = memo(({ password }: PasswordDisplayProps) => {
  if (!password) {
    return (
      <span className="text-xs text-gray-400 italic">Sin contraseña</span>
    );
  }

  // Si es string (texto)
  if (typeof password === 'string') {
    return (
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className="h-7 px-2">
            <Lock className="h-3 w-3 mr-1" />
            <span className="text-xs">Ver contraseña</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-3">
          <div className="space-y-2">
            <p className="text-xs font-medium text-gray-500">Contraseña:</p>
            <p className="font-mono text-sm font-semibold">{password}</p>
          </div>
        </PopoverContent>
      </Popover>
    );
  }

  // Si es patrón gráfico (GraphPattern)
  const pattern = password as GraphPattern;
  const getNodePosition = (index: number): [number, number] => {
    const row = Math.floor(index / 3);
    const col = index % 3;
    return [col * 40 + 40, row * 40 + 40];
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="h-7 px-2">
          <Eye className="h-3 w-3 mr-1" />
          <span className="text-xs">Ver patrón</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-4">
        <div className="space-y-2">
          <p className="text-xs font-medium text-gray-500 text-center">Patrón de desbloqueo:</p>
          <svg
            viewBox="0 0 160 160"
            className="w-32 h-32 border-2 border-gray-300 rounded-lg bg-white"
          >
            {/* Líneas del patrón */}
            {pattern.length > 1 &&
              pattern.slice(0, -1).map((nodeIndex, i) => {
                const [x1, y1] = getNodePosition(nodeIndex);
                const [x2, y2] = getNodePosition(pattern[i + 1]);
                return (
                  <line
                    key={`line-${i}`}
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke="#3b82f6"
                    strokeWidth={2}
                    strokeLinecap="round"
                  />
                );
              })}

            {/* Nodos */}
            {Array.from({ length: 9 }).map((_, index) => {
              const [x, y] = getNodePosition(index);
              const isSelected = pattern.includes(index);
              const orderIndex = pattern.indexOf(index);

              return (
                <g key={`node-${index}`}>
                  {isSelected && (
                    <circle cx={x} cy={y} r={16} fill="rgba(59, 130, 246, 0.1)" />
                  )}
                  <circle
                    cx={x}
                    cy={y}
                    r={8}
                    fill={isSelected ? "#3b82f6" : "#9ca3af"}
                  />
                  {isSelected && orderIndex >= 0 && (
                    <text
                      x={x}
                      y={y}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill="white"
                      fontSize="8"
                      fontWeight="bold"
                    >
                      {orderIndex + 1}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        </div>
      </PopoverContent>
    </Popover>
  );
});

PasswordDisplay.displayName = 'PasswordDisplay';

export default PasswordDisplay;
