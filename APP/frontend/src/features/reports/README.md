# Módulo de Reportes

Este módulo proporciona análisis y visualización de datos de ventas y productos.

## Características Principales

### 📊 Reportes Disponibles

1. **Productos Más Vendidos**
   - Top 10 productos por cantidad vendida
   - Visualización en gráfico de barras
   - Tabla detallada con ingresos generados

2. **Ventas Diarias**
   - Evolución temporal de ventas
   - Gráficos separados por moneda (BS y ARS)
   - Tabla con desglose diario

3. **Métodos de Pago**
   - Distribución de ventas por método de pago
   - Porcentajes y totales
   - Gráfico circular

### 💰 Soporte Multi-Moneda

El módulo soporta ventas en dos monedas:
- **BS (Bolivianos)**
- **ARS (Pesos Argentinos)**

Los reportes separan automáticamente las estadísticas por moneda:
- Ingresos totales BS y ARS
- Promedios por venta en cada moneda
- Promedios diarios separados
- Gráficas de evolución independientes

### 📈 Métricas Incluidas

- **Ventas Totales**: En BS y ARS separadamente
- **Promedio por Venta**: Calculado para cada moneda
- **Promedio Diario**: Ingresos promedio por día
- **Número de Transacciones**: Total de ventas realizadas
- **Top Productos**: Los 10 más vendidos con ingresos

## Estructura de Archivos

```
reports/
├── components/
│   ├── types/
│   │   └── Types.tsx                 # Tipos TypeScript
│   ├── DailySalesChart.tsx           # Gráfico de ventas diarias
│   ├── DailySalesTable.tsx           # Tabla de ventas diarias
│   ├── DateRangeFilter.tsx           # Filtro de rango de fechas
│   ├── ErrorCard.tsx                 # Componente de error
│   ├── PaymentMethodChart.tsx        # Gráfico de métodos de pago
│   ├── SummaryCards.tsx              # Tarjetas resumen
│   ├── TopProductsChart.tsx          # Gráfico de top productos
│   ├── TopProductsTable.tsx          # Tabla de top productos
│   ├── useDailySales.tsx             # Hook para ventas diarias
│   ├── usePaymentMethods.tsx         # Hook para métodos de pago
│   ├── useSalesData.tsx              # Hook para cargar ventas
│   ├── useSalesSummary.tsx           # Hook para resumen
│   └── useTopProducts.tsx            # Hook para top productos
├── views/
│   └── ReportsPage.tsx               # Página principal
└── index.ts
```

## Tecnologías Utilizadas

- **React**: Framework principal
- **Chart.js**: Librería de gráficos
- **Shadcn/ui**: Componentes de UI
- **TypeScript**: Tipado estático
- **PouchDB**: Base de datos local

## Uso

### Filtros de Fecha

La página permite filtrar ventas por rango de fechas:
- Fecha desde
- Fecha hasta
- Por defecto muestra los últimos 30 días

### Navegación por Tabs

Tres pestañas principales:
1. 📦 Productos más vendidos
2. 📈 Ventas por día
3. 💳 Métodos de pago

## Integración con Servicios

El módulo utiliza:
- `salesService`: Para obtener datos de ventas
- `productService`: Para información de productos

## Notas de Implementación

- Todas las consultas se realizan contra la base de datos local
- Los datos se procesan en el cliente usando hooks personalizados
- Las gráficas se actualizan automáticamente al cambiar el rango de fechas
- El código está optimizado con `useMemo` para evitar cálculos innecesarios
