/**
 * ============================================================================
 * Trade Panel Component
 * ============================================================================
 * 
 * A comprehensive trading interface with:
 * - Symbol selection with real-time price updates
 * - Quantity input with validation
 * - Market/Limit order type selection
 * - Buy/Sell action buttons
 * - Real-time estimated total calculation
 * - Portfolio info display (cash, holdings)
 * - Validation error messages
 * - Success/Error feedback
 * - Throttle protection
 * - Loading states
 * 
 * Integration:
 * - PriceEngine: Subscribe to real-time prices
 * - TradeEngine: Execute trades, get portfolio state
 * - watchlist: Can receive initial symbol from parent
 * ============================================================================
 */

import { useState, useEffect, useCallback, useMemo, memo } from 'react';
import type { TradeRequest, PriceData, Portfolio } from '@types';
import TradeEngine from '@engines/TradeEngine';
import PriceEngine from '@engines/PriceEngine';
import styles from './TradePanel.module.css';

/**
 * ============================================================================
 * TYPES
 * ============================================================================
 */

interface TradePanelProps {
  /** Initial symbol to pre-populate (e.g., from watchlist click) */
  initialSymbol?: string;
  /** Optional CSS class */
  className?: string;
  /** Callback when trade is successfully executed */
  onTradeSuccess?: (tradeId: string) => void;
  /** Callback when trade fails */
  onTradeError?: (error: string) => void;
}

type TradeType = 'BUY' | 'SELL';
type OrderType = 'MARKET' | 'LIMIT';

interface FormState {
  symbol: string;
  quantity: string;
  price: string;
  tradeType: TradeType;
  orderType: OrderType;
}

interface ValidationErrors {
  symbol?: string;
  quantity?: string;
  price?: string;
  general?: string;
}

type ExecutionState = 'idle' | 'loading' | 'success' | 'error';

/**
 * ============================================================================
 * MAIN COMPONENT
 * ============================================================================
 */

export function TradePanel({
  initialSymbol = '',
  className,
  onTradeSuccess,
  onTradeError,
}: TradePanelProps) {
  // =========================================================================
  // STATE
  // =========================================================================

  // Form state
  const [formState, setFormState] = useState<FormState>({
    symbol: initialSymbol.toUpperCase(),
    quantity: '',
    price: '',
    tradeType: 'BUY',
    orderType: 'MARKET',
  });

  // UI state
  const [executionState, setExecutionState] = useState<ExecutionState>('idle');
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const [successMessage, setSuccessMessage] = useState<string>('');

  // Data state
  const [currentPrice, setCurrentPrice] = useState<PriceData | null>(null);
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);

  // =========================================================================
  // LOAD PORTFOLIO ON MOUNT
  // =========================================================================

  useEffect(() => {
    const loadedPortfolio = TradeEngine.getPortfolio();
    setPortfolio(loadedPortfolio);
  }, []);

  // =========================================================================
  // SUBSCRIBE TO PRICE UPDATES
  // =========================================================================

  useEffect(() => {
    if (!formState.symbol) {
      setCurrentPrice(null);
      return;
    }

    // Get initial price
    const initialPrice = PriceEngine.getPrice(formState.symbol);
    if (initialPrice) {
      setCurrentPrice(initialPrice);

      // Auto-populate price for MARKET orders
      if (formState.orderType === 'MARKET') {
        setFormState((prev) => ({ ...prev, price: initialPrice.price.toFixed(2) }));
      }
    }

    // Subscribe to updates
    const unsubscribe = PriceEngine.subscribe(formState.symbol, (priceData) => {
      setCurrentPrice(priceData);

      // Auto-update price for MARKET orders
      if (formState.orderType === 'MARKET') {
        setFormState((prev) => ({ ...prev, price: priceData.price.toFixed(2) }));
      }
    });

    return unsubscribe;
  }, [formState.symbol, formState.orderType]);

  // =========================================================================
  // FORM HANDLERS
  // =========================================================================

  const handleSymbolChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase().replace(/[^A-Z0-9.]/g, '');
    setFormState((prev) => ({ ...prev, symbol: value }));
    setValidationErrors((prev) => ({ ...prev, symbol: undefined }));
  }, []);

  const handleQuantityChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Allow only positive integers
    if (value === '' || /^\d+$/.test(value)) {
      setFormState((prev) => ({ ...prev, quantity: value }));
      setValidationErrors((prev) => ({ ...prev, quantity: undefined }));
    }
  }, []);

  const handlePriceChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Allow numbers with up to 2 decimal places
    if (value === '' || /^\d*\.?\d{0,2}$/.test(value)) {
      setFormState((prev) => ({ ...prev, price: value }));
      setValidationErrors((prev) => ({ ...prev, price: undefined }));
    }
  }, []);

  const handleOrderTypeChange = useCallback((type: OrderType) => {
    setFormState((prev) => {
      const newState = { ...prev, orderType: type };
      
      // Auto-populate price for MARKET orders
      if (type === 'MARKET' && currentPrice) {
        newState.price = currentPrice.price.toFixed(2);
      }
      
      return newState;
    });
  }, [currentPrice]);

  // =========================================================================
  // VALIDATION
  // =========================================================================

  const validateForm = useCallback((): boolean => {
    const errors: ValidationErrors = {};

    // Validate symbol
    if (!formState.symbol) {
      errors.symbol = 'Symbol is required';
    } else if (formState.symbol.length < 1 || formState.symbol.length > 10) {
      errors.symbol = 'Symbol must be 1-10 characters';
    } else if (!/^[A-Z0-9.]+$/.test(formState.symbol)) {
      errors.symbol = 'Invalid symbol format';
    }

    // Validate quantity
    if (!formState.quantity) {
      errors.quantity = 'Quantity is required';
    } else {
      const qty = parseInt(formState.quantity, 10);
      if (qty <= 0) {
        errors.quantity = 'Quantity must be positive';
      } else if (!Number.isInteger(qty)) {
        errors.quantity = 'Fractional shares not allowed';
      }
    }

    // Validate price
    if (!formState.price) {
      errors.price = 'Price is required';
    } else {
      const price = parseFloat(formState.price);
      if (price < 0.01) {
        errors.price = 'Price must be at least $0.01';
      } else if (price > 1_000_000) {
        errors.price = 'Price exceeds maximum ($1,000,000)';
      }
    }

    // Check portfolio constraints
    if (portfolio && !errors.quantity && !errors.price) {
      const qty = parseInt(formState.quantity, 10);
      const price = parseFloat(formState.price);
      const total = qty * price;

      if (formState.tradeType === 'BUY') {
        if (portfolio.cash < total) {
          const shortfall = total - portfolio.cash;
          errors.general = `Insufficient cash. Need $${total.toFixed(2)}, have $${portfolio.cash.toFixed(2)} (short $${shortfall.toFixed(2)})`;
        }
      } else {
        const position = portfolio.positions[formState.symbol];
        if (!position || position.shares < qty) {
          const have = position?.shares || 0;
          errors.general = `Insufficient shares. Trying to sell ${qty}, have ${have}`;
        }
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  }, [formState, portfolio]);

  // =========================================================================
  // TRADE EXECUTION
  // =========================================================================

  const executeTrade = useCallback(
    async (type: TradeType) => {
      // Clear previous messages
      setSuccessMessage('');
      setValidationErrors({});

      // Validate form
      if (!validateForm()) {
        return;
      }

      // Check throttle
      if (TradeEngine.isThrottled()) {
        const remaining = TradeEngine.getThrottleRemaining();
        setValidationErrors({
          general: `Please wait ${Math.ceil(remaining / 1000)} second(s) before trading again`,
        });
        return;
      }

      // Set loading state
      setExecutionState('loading');

      // Prepare trade request
      const request: TradeRequest = {
        symbol: formState.symbol,
        type,
        quantity: parseInt(formState.quantity, 10),
        price: parseFloat(formState.price),
        orderType: formState.orderType,
      };

      // Execute trade (synchronous in this implementation)
      try {
        const result = TradeEngine.executeTrade(request);

        if (result.success && result.trade) {
          // Success!
          setExecutionState('success');
          setSuccessMessage(
            `${type} order executed: ${request.quantity} ${request.symbol} @ $${request.price.toFixed(2)} (Total: $${result.trade.total.toFixed(2)})`
          );

          // Update portfolio
          const newPortfolio = TradeEngine.getPortfolio();
          setPortfolio(newPortfolio);

          // Reset form
          setFormState((prev) => ({
            ...prev,
            quantity: '',
          }));

          // Notify parent
          if (onTradeSuccess) {
            onTradeSuccess(result.trade.id);
          }

          // Clear success message after 5 seconds
          setTimeout(() => {
            setExecutionState('idle');
            setSuccessMessage('');
          }, 5000);
        } else {
          // Error
          setExecutionState('error');
          const errorMsg = result.error || 'Trade execution failed';
          setValidationErrors({ general: errorMsg });

          // Notify parent
          if (onTradeError) {
            onTradeError(errorMsg);
          }

          // Clear error after 5 seconds
          setTimeout(() => {
            setExecutionState('idle');
          }, 5000);
        }
      } catch (error) {
        // Unexpected error
        setExecutionState('error');
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        setValidationErrors({ general: errorMsg });

        if (onTradeError) {
          onTradeError(errorMsg);
        }

        setTimeout(() => {
          setExecutionState('idle');
        }, 5000);
      }
    },
    [formState, portfolio, validateForm, onTradeSuccess, onTradeError]
  );

  const handleBuyClick = useCallback(() => {
    executeTrade('BUY');
  }, [executeTrade]);

  const handleSellClick = useCallback(() => {
    executeTrade('SELL');
  }, [executeTrade]);

  // =========================================================================
  // COMPUTED VALUES
  // =========================================================================

  const estimatedTotal = useMemo(() => {
    if (!formState.quantity || !formState.price) return null;

    const qty = parseInt(formState.quantity, 10);
    const price = parseFloat(formState.price);

    if (isNaN(qty) || isNaN(price) || qty <= 0 || price <= 0) return null;

    return qty * price;
  }, [formState.quantity, formState.price]);

  const hasValidationErrors = Object.keys(validationErrors).length > 0;
  const isLoading = executionState === 'loading';
  const isThrottled = TradeEngine.isThrottled();

  // Get current position for the symbol
  const currentPosition =
    portfolio && formState.symbol ? portfolio.positions[formState.symbol] : null;

  // =========================================================================
  // RENDER
  // =========================================================================

  return (
    <div className={`${styles.container} ${className || ''}`}>
      {/* HEADER */}
      <div className={styles.header}>
        <h2 className={styles.title}>
          <span className={styles.titleIcon}>💹</span>
          Trade Panel
        </h2>
      </div>

      {/* CONTENT */}
      <div className={styles.content}>
        {/* SYMBOL INPUT */}
        <div className={styles.formGroup}>
          <label htmlFor="trade-symbol" className={styles.label}>
            Symbol <span className={styles.required}>*</span>
          </label>
          <input
            id="trade-symbol"
            type="text"
            className={`${styles.input} ${styles.symbolInput} ${
              validationErrors.symbol ? styles.error : ''
            }`}
            placeholder="AAPL"
            value={formState.symbol}
            onChange={handleSymbolChange}
            maxLength={10}
            disabled={isLoading}
            autoComplete="off"
          />
          {validationErrors.symbol && (
            <div className={styles.errorMessage}>
              <span className={styles.errorIcon}>⚠️</span>
              {validationErrors.symbol}
            </div>
          )}
        </div>

        {/* CURRENT PRICE DISPLAY */}
        {formState.symbol && (
          <div className={styles.priceDisplay}>
            <div className={styles.priceLabel}>Current Price</div>
            {currentPrice ? (
              <>
                <div className={styles.priceValue}>${currentPrice.price.toFixed(2)}</div>
                <div
                  className={`${styles.priceChange} ${
                    currentPrice.change >= 0 ? styles.positive : styles.negative
                  }`}
                >
                  {currentPrice.change >= 0 ? '▲' : '▼'} {currentPrice.change.toFixed(2)} (
                  {currentPrice.changePercent.toFixed(2)}%)
                </div>
              </>
            ) : (
              <div className={styles.priceLoading}>Loading price...</div>
            )}
          </div>
        )}

        {/* ORDER TYPE TOGGLE */}
        <div className={styles.formGroup}>
          <label className={styles.label}>Order Type</label>
          <div className={styles.orderTypeToggle}>
            <button
              type="button"
              className={`${styles.orderTypeButton} ${
                formState.orderType === 'MARKET' ? styles.active : ''
              }`}
              onClick={() => handleOrderTypeChange('MARKET')}
              disabled={isLoading}
            >
              Market
            </button>
            <button
              type="button"
              className={`${styles.orderTypeButton} ${
                formState.orderType === 'LIMIT' ? styles.active : ''
              }`}
              onClick={() => handleOrderTypeChange('LIMIT')}
              disabled={isLoading}
            >
              Limit
            </button>
          </div>
        </div>

        {/* QUANTITY INPUT */}
        <div className={styles.formGroup}>
          <label htmlFor="trade-quantity" className={styles.label}>
            Quantity (Shares) <span className={styles.required}>*</span>
          </label>
          <input
            id="trade-quantity"
            type="text"
            inputMode="numeric"
            className={`${styles.input} ${validationErrors.quantity ? styles.error : ''}`}
            placeholder="10"
            value={formState.quantity}
            onChange={handleQuantityChange}
            disabled={isLoading}
            autoComplete="off"
          />
          {validationErrors.quantity && (
            <div className={styles.errorMessage}>
              <span className={styles.errorIcon}>⚠️</span>
              {validationErrors.quantity}
            </div>
          )}
        </div>

        {/* PRICE INPUT */}
        <div className={styles.formGroup}>
          <label htmlFor="trade-price" className={styles.label}>
            Price <span className={styles.required}>*</span>
          </label>
          <input
            id="trade-price"
            type="text"
            inputMode="decimal"
            className={`${styles.input} ${validationErrors.price ? styles.error : ''}`}
            placeholder="150.00"
            value={formState.price}
            onChange={handlePriceChange}
            disabled={isLoading || formState.orderType === 'MARKET'}
            autoComplete="off"
          />
          {validationErrors.price && (
            <div className={styles.errorMessage}>
              <span className={styles.errorIcon}>⚠️</span>
              {validationErrors.price}
            </div>
          )}
        </div>

        {/* ESTIMATED TOTAL */}
        {estimatedTotal !== null && (
          <div className={styles.estimatedTotal}>
            <div className={styles.estimatedLabel}>Estimated Total</div>
            <div className={styles.estimatedValue}>${estimatedTotal.toFixed(2)}</div>
            <div className={styles.estimatedBreakdown}>
              {formState.quantity} shares × ${formState.price}
            </div>
          </div>
        )}

        {/* VALIDATION ERRORS */}
        {validationErrors.general && (
          <div className={styles.errorMessage}>
            <span className={styles.errorIcon}>⚠️</span>
            {validationErrors.general}
          </div>
        )}

        {/* THROTTLE WARNING */}
        {isThrottled && !isLoading && (
          <div className={styles.throttleWarning}>
            <span className={styles.throttleIcon}>⏱️</span>
            Please wait {Math.ceil(TradeEngine.getThrottleRemaining() / 1000)} second(s) before
            trading again
          </div>
        )}

        {/* SUCCESS MESSAGE */}
        {executionState === 'success' && successMessage && (
          <div className={styles.successMessage}>
            <span className={styles.successIcon}>✅</span>
            <div className={styles.successContent}>
              <div className={styles.successTitle}>Trade Executed Successfully!</div>
              <div className={styles.successDetails}>{successMessage}</div>
            </div>
          </div>
        )}

        {/* ACTION BUTTONS */}
        <div className={styles.actions}>
          <button
            type="button"
            className={`${styles.button} ${styles.buyButton} ${isLoading ? styles.loading : ''}`}
            onClick={handleBuyClick}
            disabled={isLoading || isThrottled || hasValidationErrors}
          >
            {isLoading && <span className={styles.spinner} />}
            <span className={styles.buttonText}>Buy</span>
          </button>
          <button
            type="button"
            className={`${styles.button} ${styles.sellButton} ${isLoading ? styles.loading : ''}`}
            onClick={handleSellClick}
            disabled={isLoading || isThrottled || hasValidationErrors}
          >
            {isLoading && <span className={styles.spinner} />}
            <span className={styles.buttonText}>Sell</span>
          </button>
        </div>

        {/* PORTFOLIO INFO */}
        {portfolio && (
          <div className={styles.portfolioInfo}>
            <div className={styles.portfolioItem}>
              <div className={styles.portfolioLabel}>Cash</div>
              <div className={styles.portfolioValue}>${portfolio.cash.toFixed(2)}</div>
            </div>
            {currentPosition && (
              <div className={styles.portfolioItem}>
                <div className={styles.portfolioLabel}>{formState.symbol} Holdings</div>
                <div className={styles.portfolioValue}>
                  {currentPosition.shares} @ ${currentPosition.avgCost.toFixed(2)}
                </div>
              </div>
            )}
            <div className={styles.portfolioItem}>
              <div className={styles.portfolioLabel}>Realized P&L</div>
              <div
                className={styles.portfolioValue}
                style={{
                  color:
                    portfolio.realizedPL >= 0
                      ? 'var(--color-success, #10b981)'
                      : 'var(--color-error, #ef4444)',
                }}
              >
                ${portfolio.realizedPL.toFixed(2)}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default memo(TradePanel);
