import { useState, useRef, useEffect } from "react";
import type { GraphPattern } from "../types/modelTypes/Reparation";

interface Props {
  value?: GraphPattern;
  onChange?: (pattern: GraphPattern) => void;
  disabled?: boolean;
  size?: "sm" | "md" | "lg";
}

const GraphPatternInput = ({ value, onChange, disabled = false, size = "md" }: Props) => {
  const [pattern, setPattern] = useState<GraphPattern>(value || []);
  const [isDrawing, setIsDrawing] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);

  // Sincronizar estado local con prop value
  useEffect(() => {
    if (value !== undefined) {
      setPattern(value);
    }
  }, [value]);

  const nodeSize = size === "sm" ? 12 : size === "md" ? 16 : 20;
  const spacing = size === "sm" ? 40 : size === "md" ? 60 : 80;
  const lineWidth = size === "sm" ? 2 : size === "md" ? 3 : 4;

  // Posiciones de los nodos en el grid 3x3
  const getNodePosition = (index: number): [number, number] => {
    const row = Math.floor(index / 3);
    const col = index % 3;
    return [col * spacing + spacing, row * spacing + spacing];
  };

  const handleNodeClick = (nodeIndex: number) => {
    if (disabled) return;

    // Si el nodo ya está en el patrón, no hacer nada
    if (pattern.includes(nodeIndex)) {
      return;
    }

    // Agregar el nodo al patrón
    const newPattern = [...pattern, nodeIndex];
    setPattern(newPattern);
    setIsDrawing(true);
    onChange?.(newPattern);
  };

  const handleNodeEnter = (nodeIndex: number) => {
    if (disabled || !isDrawing) return;
    
    // Si el nodo ya está en el patrón, no hacer nada
    if (pattern.includes(nodeIndex)) {
      return;
    }

    // Agregar el nodo al patrón mientras se arrastra
    const newPattern = [...pattern, nodeIndex];
    setPattern(newPattern);
    onChange?.(newPattern);
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
  };

  const handleClear = () => {
    setPattern([]);
    setIsDrawing(false);
    onChange?.([]);
  };

  const viewBoxSize = spacing * 4;

  return (
    <div className="flex flex-col items-center gap-2">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}
        className={`border-2 border-gray-300 rounded-lg bg-white ${
          size === "sm" ? "w-32 h-32" : size === "md" ? "w-48 h-48" : "w-64 h-64"
        } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
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
                strokeWidth={lineWidth}
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
            <g 
              key={`node-${index}`} 
              onMouseDown={() => handleNodeClick(index)}
              onMouseEnter={() => handleNodeEnter(index)}
              style={{ cursor: disabled ? 'not-allowed' : 'pointer' }}
            >
              {/* Círculo exterior (área de selección) */}
              <circle
                cx={x}
                cy={y}
                r={nodeSize * 2}
                fill={isSelected ? "rgba(59, 130, 246, 0.1)" : "transparent"}
                className="transition-colors"
              />
              {/* Nodo principal */}
              <circle
                cx={x}
                cy={y}
                r={nodeSize}
                fill={isSelected ? "#3b82f6" : "#9ca3af"}
                className="transition-all"
              />
              {/* Número de orden */}
              {isSelected && orderIndex >= 0 && (
                <text
                  x={x}
                  y={y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="white"
                  fontSize={nodeSize}
                  fontWeight="bold"
                >
                  {orderIndex + 1}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {!disabled && (
        <button
          type="button"
          onClick={handleClear}
          className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded transition-colors"
        >
          Limpiar patrón
        </button>
      )}

      {pattern.length > 0 && (
        <p className="text-xs text-gray-500">
          {pattern.length} {pattern.length === 1 ? "nodo" : "nodos"} seleccionados
        </p>
      )}
    </div>
  );
};

export default GraphPatternInput;
