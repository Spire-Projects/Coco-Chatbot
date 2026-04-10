import { memo, useState, useCallback, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

type Matrix3x3 = [[0 | 1, 0 | 1, 0 | 1], [0 | 1, 0 | 1, 0 | 1], [0 | 1, 0 | 1, 0 | 1]];

interface PatternLockProps {
  value?: Matrix3x3;
  onChange: (pattern: Matrix3x3) => void;
  disabled?: boolean;
}

const PatternLock = memo(({ value, onChange, disabled = false }: PatternLockProps) => {
  const [isDrawing, setIsDrawing] = useState(false);
  const [pattern, setPattern] = useState<Matrix3x3>(
    value || [
      [0, 0, 0],
      [0, 0, 0],
      [0, 0, 0],
    ]
  );
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value) {
      setPattern(value);
    }
  }, [value]);

  const toggleDot = useCallback(
    (row: number, col: number) => {
      if (disabled) return;

      const newPattern = pattern.map((r, rIdx) =>
        r.map((c, cIdx) => {
          if (rIdx === row && cIdx === col) {
            return c === 0 ? 1 : 0;
          }
          return c;
        })
      ) as Matrix3x3;

      setPattern(newPattern);
      onChange(newPattern);
    },
    [pattern, onChange, disabled]
  );

  const handleMouseDown = useCallback(
    (row: number, col: number) => {
      if (disabled) return;
      setIsDrawing(true);
      toggleDot(row, col);
    },
    [toggleDot, disabled]
  );

  const handleMouseEnter = useCallback(
    (row: number, col: number) => {
      if (isDrawing && !disabled) {
        toggleDot(row, col);
      }
    },
    [isDrawing, toggleDot, disabled]
  );

  const handleMouseUp = useCallback(() => {
    setIsDrawing(false);
  }, []);

  useEffect(() => {
    const handleGlobalMouseUp = () => setIsDrawing(false);
    document.addEventListener('mouseup', handleGlobalMouseUp);
    return () => document.removeEventListener('mouseup', handleGlobalMouseUp);
  }, []);

  const handleClear = useCallback(() => {
    if (disabled) return;
    const emptyPattern: Matrix3x3 = [
      [0, 0, 0],
      [0, 0, 0],
      [0, 0, 0],
    ];
    setPattern(emptyPattern);
    onChange(emptyPattern);
  }, [onChange, disabled]);

  return (
    <div className="space-y-3">
      <div
        ref={containerRef}
        className={cn(
          "relative inline-block p-4 bg-gray-50 rounded-lg border-2 border-gray-200 select-none",
          disabled && "opacity-50 cursor-not-allowed"
        )}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <div className="grid grid-cols-3 gap-4">
          {pattern.map((row, rowIdx) =>
            row.map((cell, colIdx) => (
              <div
                key={`${rowIdx}-${colIdx}`}
                onMouseDown={() => handleMouseDown(rowIdx, colIdx)}
                onMouseEnter={() => handleMouseEnter(rowIdx, colIdx)}
                className={cn(
                  "w-12 h-12 rounded-full border-2 transition-all duration-200 cursor-pointer",
                  cell === 1
                    ? "bg-blue-500 border-blue-600 shadow-lg scale-110"
                    : "bg-white border-gray-300 hover:border-blue-300 hover:bg-blue-50",
                  disabled && "cursor-not-allowed hover:border-gray-300 hover:bg-white"
                )}
              />
            ))
          )}
        </div>
      </div>
      <button
        type="button"
        onClick={handleClear}
        disabled={disabled}
        className={cn(
          "text-xs text-gray-500 hover:text-gray-700 underline",
          disabled && "cursor-not-allowed opacity-50"
        )}
      >
        Limpiar patrón
      </button>
    </div>
  );
});

PatternLock.displayName = 'PatternLock';

export default PatternLock;
