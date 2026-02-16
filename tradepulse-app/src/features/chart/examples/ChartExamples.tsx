/**
 * ============================================================================
 * Chart Component Usage Examples
 * ============================================================================
 * 
 * Practical examples demonstrating various Chart component use cases.
 */

import React, { useEffect, useState } from 'react';
import PriceEngine from '@engines/PriceEngine';
import { Chart, useChartData, useMultiChartData } from '@features/chart';

/**
 * ============================================================================
 * EXAMPLE 1: Basic Chart
 * ============================================================================
 */
export function BasicChartExample() {
  // Start PriceEngine on mount
  useEffect(() => {
    PriceEngine.start();
    return () => PriceEngine.stop();
  }, []);

  return (
    <div style={{ padding: '20px' }}>
      <h2>Basic Real-Time Chart</h2>
      <Chart 
        symbol="AAPL" 
        width={1000}
        height={500}
      />
    </div>
  );
}

/**
 * ============================================================================
 * EXAMPLE 2: Multiple Charts (Comparison)
 * ============================================================================
 */
export function MultipleChartsExample() {
  const symbols = ['AAPL', 'GOOGL', 'MSFT', 'AMZN'];

  return (
    <div style={{ padding: '20px' }}>
      <h2>Stock Comparison</h2>
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(2, 1fr)', 
        gap: '20px' 
      }}>
        {symbols.map(symbol => (
          <Chart 
            key={symbol}
            symbol={symbol}
            width={600}
            height={400}
            showGrid={true}
            showArea={true}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * ============================================================================
 * EXAMPLE 3: Customized Chart Appearance
 * ============================================================================
 */
export function CustomizedChartExample() {
  return (
    <div style={{ padding: '20px' }}>
      <h2>Customized Chart</h2>
      
      {/* Chart with custom colors */}
      <Chart 
        symbol="TSLA"
        width={1200}
        height={600}
        lineColor="#8b5cf6"
        areaColor="rgba(139, 92, 246, 0.1)"
        showArea={true}
        showGrid={false}
        showTooltip={true}
      />
      
      {/* Minimal chart (no axes) */}
      <Chart 
        symbol="NVDA"
        width={800}
        height={200}
        showPriceAxis={false}
        showTimeAxis={false}
        showGrid={false}
        showArea={false}
      />
    </div>
  );
}

/**
 * ============================================================================
 * EXAMPLE 4: Chart with Data Hook
 * ============================================================================
 */
export function ChartWithDataHookExample() {
  const { data, currentPrice, isLoading, error } = useChartData('AAPL');

  if (isLoading) {
    return <div>Loading chart data...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div style={{ padding: '20px' }}>
      <h2>Chart with Custom Header</h2>
      
      {/* Custom header using hook data */}
      <div style={{ 
        padding: '20px', 
        background: '#f9fafb',
        borderRadius: '8px',
        marginBottom: '20px'
      }}>
        <h3 style={{ margin: '0 0 10px 0' }}>AAPL - Apple Inc.</h3>
        {currentPrice && (
          <div style={{ display: 'flex', gap: '20px', fontSize: '14px' }}>
            <div>
              <strong>Current:</strong> ${currentPrice.price.toFixed(2)}
            </div>
            <div>
              <strong>Change:</strong>{' '}
              <span style={{ color: currentPrice.change >= 0 ? '#10b981' : '#ef4444' }}>
                {currentPrice.change >= 0 ? '+' : ''}
                {currentPrice.changePercent.toFixed(2)}%
              </span>
            </div>
            <div>
              <strong>High:</strong> ${currentPrice.high.toFixed(2)}
            </div>
            <div>
              <strong>Low:</strong> ${currentPrice.low.toFixed(2)}
            </div>
            <div>
              <strong>Data Points:</strong> {data.length}
            </div>
          </div>
        )}
      </div>

      {/* Chart */}
      <Chart symbol="AAPL" width={1200} height={600} />
    </div>
  );
}

/**
 * ============================================================================
 * EXAMPLE 5: Time Range Selector
 * ============================================================================
 */
export function TimeRangeSelectorExample() {
  const [range, setRange] = useState<'1m' | '5m' | 'all'>('all');
  const [maxPoints, setMaxPoints] = useState(500);

  useEffect(() => {
    // Adjust points based on range
    switch (range) {
      case '1m':
        setMaxPoints(60);  // 1 minute = 60 seconds
        break;
      case '5m':
        setMaxPoints(300); // 5 minutes = 300 seconds
        break;
      case 'all':
        setMaxPoints(500); // All history
        break;
    }
  }, [range]);

  return (
    <div style={{ padding: '20px' }}>
      <h2>Time Range Selector</h2>
      
      {/* Range selector buttons */}
      <div style={{ marginBottom: '20px', display: 'flex', gap: '10px' }}>
        {(['1m', '5m', 'all'] as const).map(r => (
          <button
            key={r}
            onClick={() => setRange(r)}
            style={{
              padding: '8px 16px',
              background: range === r ? '#3b82f6' : '#e5e7eb',
              color: range === r ? '#ffffff' : '#111827',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: range === r ? '600' : '400',
            }}
          >
            {r === '1m' ? 'Last 1 Min' : r === '5m' ? 'Last 5 Min' : 'All'}
          </button>
        ))}
      </div>

      {/* Chart with dynamic maxPoints */}
      <Chart 
        symbol="MSFT"
        width={1200}
        height={600}
        maxPoints={maxPoints}
      />
    </div>
  );
}

/**
 * ============================================================================
 * EXAMPLE 6: Dashboard with Multiple Charts
 * ============================================================================
 */
export function DashboardExample() {
  const watchlist = ['AAPL', 'GOOGL', 'MSFT', 'AMZN', 'TSLA', 'NVDA'];
  const dataMap = useMultiChartData(watchlist, 200);

  return (
    <div style={{ padding: '20px' }}>
      <h1>Trading Dashboard</h1>
      
      {/* Main chart (large) */}
      <div style={{ marginBottom: '30px' }}>
        <h2>Featured: AAPL</h2>
        <Chart 
          symbol="AAPL"
          width={1400}
          height={600}
          showArea={true}
          showGrid={true}
          showTooltip={true}
        />
      </div>

      {/* Grid of smaller charts */}
      <h2>Watchlist</h2>
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(3, 1fr)', 
        gap: '20px' 
      }}>
        {watchlist.slice(1).map(symbol => {
          const pointCount = dataMap.get(symbol)?.length || 0;
          
          return (
            <div key={symbol} style={{ 
              background: '#f9fafb',
              borderRadius: '8px',
              padding: '10px'
            }}>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between',
                marginBottom: '10px',
                fontSize: '14px'
              }}>
                <strong>{symbol}</strong>
                <span style={{ color: '#6b7280' }}>{pointCount} points</span>
              </div>
              <Chart 
                symbol={symbol}
                width={450}
                height={200}
                showPriceAxis={false}
                showTimeAxis={false}
                showGrid={false}
                maxPoints={200}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * ============================================================================
 * EXAMPLE 7: Responsive Chart
 * ============================================================================
 */
export function ResponsiveChartExample() {
  const [windowWidth, setWindowWidth] = useState(
    typeof window !== 'undefined' ? window.innerWidth : 1200
  );

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Calculate chart size based on viewport
  const chartWidth = Math.min(windowWidth - 40, 1400);
  const chartHeight = windowWidth < 768 ? 300 : 600;

  return (
    <div style={{ padding: '20px' }}>
      <h2>Responsive Chart</h2>
      <p style={{ color: '#6b7280', fontSize: '14px' }}>
        Current viewport: {windowWidth}px wide
        {windowWidth < 768 ? ' (Mobile)' : windowWidth < 1024 ? ' (Tablet)' : ' (Desktop)'}
      </p>
      
      <Chart 
        symbol="AAPL"
        width={chartWidth}
        height={chartHeight}
        showGrid={windowWidth >= 768}
        showPriceAxis={windowWidth >= 768}
        showTimeAxis={windowWidth >= 768}
      />
    </div>
  );
}

/**
 * ============================================================================
 * EXAMPLE 8: Chart with Statistics Panel
 * ============================================================================
 */
export function ChartWithStatsExample() {
  const { data, currentPrice } = useChartData('AAPL');

  // Calculate statistics
  const stats = React.useMemo(() => {
    if (data.length === 0) return null;

    const prices = data.map(d => d.price);
    const avgPrice = prices.reduce((sum, p) => sum + p, 0) / prices.length;
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const priceRange = maxPrice - minPrice;
    const volatility = priceRange / avgPrice * 100;

    return { avgPrice, minPrice, maxPrice, priceRange, volatility };
  }, [data]);

  return (
    <div style={{ padding: '20px' }}>
      <h2>Chart with Statistics</h2>
      
      <div style={{ display: 'flex', gap: '20px' }}>
        {/* Chart */}
        <div style={{ flex: '1' }}>
          <Chart 
            symbol="AAPL"
            width={900}
            height={600}
          />
        </div>

        {/* Statistics panel */}
        <div style={{ 
          width: '300px',
          background: '#f9fafb',
          borderRadius: '8px',
          padding: '20px'
        }}>
          <h3 style={{ marginTop: 0 }}>Statistics</h3>
          
          {currentPrice && stats && (
            <div style={{ fontSize: '14px', lineHeight: '2' }}>
              <div>
                <strong>Current Price:</strong><br />
                ${currentPrice.price.toFixed(2)}
              </div>
              <div>
                <strong>Average Price:</strong><br />
                ${stats.avgPrice.toFixed(2)}
              </div>
              <div>
                <strong>Day High:</strong><br />
                ${stats.maxPrice.toFixed(2)}
              </div>
              <div>
                <strong>Day Low:</strong><br />
                ${stats.minPrice.toFixed(2)}
              </div>
              <div>
                <strong>Day Range:</strong><br />
                ${stats.priceRange.toFixed(2)}
              </div>
              <div>
                <strong>Volatility:</strong><br />
                {stats.volatility.toFixed(2)}%
              </div>
              <div>
                <strong>Data Points:</strong><br />
                {data.length}
              </div>
              <div>
                <strong>Bid:</strong> ${currentPrice.bid.toFixed(2)}<br />
                <strong>Ask:</strong> ${currentPrice.ask.toFixed(2)}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * ============================================================================
 * MAIN EXAMPLES APP
 * ============================================================================
 */
export function ChartExamplesApp() {
  const [activeExample, setActiveExample] = useState<number>(1);

  // Start PriceEngine once for all examples
  useEffect(() => {
    PriceEngine.start();
    return () => PriceEngine.stop();
  }, []);

  const examples = [
    { id: 1, name: 'Basic Chart', component: <BasicChartExample /> },
    { id: 2, name: 'Multiple Charts', component: <MultipleChartsExample /> },
    { id: 3, name: 'Customized', component: <CustomizedChartExample /> },
    { id: 4, name: 'With Data Hook', component: <ChartWithDataHookExample /> },
    { id: 5, name: 'Time Range', component: <TimeRangeSelectorExample /> },
    { id: 6, name: 'Dashboard', component: <DashboardExample /> },
    { id: 7, name: 'Responsive', component: <ResponsiveChartExample /> },
    { id: 8, name: 'With Statistics', component: <ChartWithStatsExample /> },
  ];

  return (
    <div>
      {/* Navigation */}
      <div style={{ 
        padding: '20px',
        background: '#111827',
        color: '#ffffff'
      }}>
        <h1 style={{ margin: '0 0 20px 0' }}>Chart Component Examples</h1>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {examples.map(ex => (
            <button
              key={ex.id}
              onClick={() => setActiveExample(ex.id)}
              style={{
                padding: '8px 16px',
                background: activeExample === ex.id ? '#3b82f6' : '#374151',
                color: '#ffffff',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: activeExample === ex.id ? '600' : '400',
              }}
            >
              {ex.name}
            </button>
          ))}
        </div>
      </div>

      {/* Active example */}
      <div>
        {examples.find(ex => ex.id === activeExample)?.component}
      </div>
    </div>
  );
}

export default ChartExamplesApp;
