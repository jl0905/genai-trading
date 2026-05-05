import React, { useCallback, useEffect, useState } from 'react';
import { api } from '../api.js';

const money = (value) => {
  const number = Number(value);
  if (!Number.isFinite(number)) return '--';
  return number.toLocaleString(undefined, { style: 'currency', currency: 'USD' });
};

export default function PaperTrading({ isActive = true }) {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(false);
  const [orderLoading, setOrderLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [order, setOrder] = useState({
    symbol: 'AAPL',
    qty: '1',
    side: 'buy',
    order_type: 'market',
    time_in_force: 'day',
  });

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setMessage('');
    try {
      const data = await api.getAlpacaPaperDashboard();
      setDashboard(data);
      if (!data.configured) {
        setMessage('Add your Alpaca key and secret in backend/scripts/alpaca_config.py.');
      } else if (!data.success) {
        setMessage('Alpaca returned an error. Check the details below.');
      }
    } catch (err) {
      setMessage(err.message || 'Could not reach the backend.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isActive) loadDashboard();
  }, [isActive, loadDashboard]);

  const submitOrder = async (event) => {
    event.preventDefault();
    setOrderLoading(true);
    setMessage('');
    try {
      const result = await api.submitAlpacaPaperOrder({
        ...order,
        symbol: order.symbol.trim().toUpperCase(),
        qty: Number(order.qty),
      });
      if (result.success) {
        setMessage(`Submitted ${order.side.toUpperCase()} ${order.qty} ${order.symbol.toUpperCase()}.`);
        loadDashboard();
      } else {
        setMessage(typeof result.error === 'string' ? result.error : JSON.stringify(result.error));
      }
    } catch (err) {
      setMessage(err.message || 'Order failed.');
    } finally {
      setOrderLoading(false);
    }
  };

  const account = dashboard?.account;
  const positions = dashboard?.positions || [];
  const orders = dashboard?.orders || [];

  return (
    <div style={{ height: '100%', overflow: 'auto', background: 'var(--bg-main)', color: 'var(--text-main)', padding: '24px' }}>
      <div style={{ maxWidth: '1180px', margin: '0 auto', display: 'grid', gap: '18px' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.6rem' }}>Paper Trading</h1>
            <p style={{ margin: '6px 0 0', color: 'var(--text-muted)' }}>Alpaca paper account, positions, orders, and test order entry.</p>
          </div>
          <button onClick={loadDashboard} disabled={loading} style={styles.button}>
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </header>

        {message && (
          <div style={{ ...styles.panel, borderColor: 'var(--theme-primary)' }}>
            {message}
          </div>
        )}

        <section style={styles.grid}>
          {[
            ['Portfolio Value', money(account?.portfolio_value)],
            ['Buying Power', money(account?.buying_power)],
            ['Cash', money(account?.cash)],
            ['Day Trade Count', account?.daytrade_count ?? '--'],
          ].map(([label, value]) => (
            <div key={label} style={styles.panel}>
              <div style={styles.label}>{label}</div>
              <div style={styles.value}>{value}</div>
            </div>
          ))}
        </section>

        <section style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 360px) 1fr', gap: '18px', alignItems: 'start' }}>
          <form onSubmit={submitOrder} style={styles.panel}>
            <h2 style={styles.heading}>Test Order</h2>
            <label style={styles.field}>
              Symbol
              <input value={order.symbol} onChange={(e) => setOrder({ ...order, symbol: e.target.value })} style={styles.input} />
            </label>
            <label style={styles.field}>
              Quantity
              <input type="number" min="0.0001" step="0.0001" value={order.qty} onChange={(e) => setOrder({ ...order, qty: e.target.value })} style={styles.input} />
            </label>
            <label style={styles.field}>
              Side
              <select value={order.side} onChange={(e) => setOrder({ ...order, side: e.target.value })} style={styles.input}>
                <option value="buy">Buy</option>
                <option value="sell">Sell</option>
              </select>
            </label>
            <button type="submit" disabled={orderLoading || !dashboard?.configured} style={{ ...styles.button, width: '100%' }}>
              {orderLoading ? 'Submitting...' : 'Submit Paper Order'}
            </button>
          </form>

          <div style={styles.panel}>
            <h2 style={styles.heading}>Positions</h2>
            <div style={{ overflowX: 'auto' }}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Symbol</th>
                    <th style={styles.th}>Qty</th>
                    <th style={styles.th}>Market Value</th>
                    <th style={styles.th}>Unrealized P/L</th>
                  </tr>
                </thead>
                <tbody>
                  {positions.length === 0 ? (
                    <tr><td colSpan="4" style={styles.empty}>No open positions.</td></tr>
                  ) : positions.map((position) => (
                    <tr key={position.asset_id || position.symbol}>
                      <td style={styles.td}>{position.symbol}</td>
                      <td style={styles.td}>{position.qty}</td>
                      <td style={styles.td}>{money(position.market_value)}</td>
                      <td style={styles.td}>{money(position.unrealized_pl)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section style={styles.panel}>
          <h2 style={styles.heading}>Recent Orders</h2>
          <div style={{ overflowX: 'auto' }}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Symbol</th>
                  <th style={styles.th}>Side</th>
                  <th style={styles.th}>Qty</th>
                  <th style={styles.th}>Status</th>
                  <th style={styles.th}>Submitted</th>
                </tr>
              </thead>
              <tbody>
                {orders.length === 0 ? (
                  <tr><td colSpan="5" style={styles.empty}>No recent orders.</td></tr>
                ) : orders.map((item) => (
                  <tr key={item.id}>
                    <td style={styles.td}>{item.symbol}</td>
                    <td style={styles.td}>{item.side}</td>
                    <td style={styles.td}>{item.qty}</td>
                    <td style={styles.td}>{item.status}</td>
                    <td style={styles.td}>{item.submitted_at ? new Date(item.submitted_at).toLocaleString() : '--'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}

const styles = {
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
    gap: '14px',
  },
  panel: {
    background: 'var(--bg-panel)',
    border: '1px solid var(--border-main)',
    borderRadius: '6px',
    padding: '16px',
  },
  label: {
    color: 'var(--text-muted)',
    fontSize: '0.82rem',
    marginBottom: '8px',
  },
  value: {
    fontSize: '1.35rem',
    fontWeight: 700,
  },
  heading: {
    margin: '0 0 14px',
    fontSize: '1.1rem',
  },
  field: {
    display: 'grid',
    gap: '6px',
    marginBottom: '12px',
    color: 'var(--text-muted)',
    fontSize: '0.85rem',
  },
  input: {
    background: 'var(--bg-main)',
    color: 'var(--text-main)',
    border: '1px solid var(--border-main)',
    borderRadius: '4px',
    padding: '10px',
    outline: 'none',
  },
  button: {
    background: 'var(--theme-primary)',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    padding: '10px 14px',
    cursor: 'pointer',
    fontWeight: 700,
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    minWidth: '560px',
  },
  th: {
    textAlign: 'left',
    color: 'var(--text-muted)',
    borderBottom: '1px solid var(--border-main)',
    padding: '10px',
    fontSize: '0.8rem',
  },
  td: {
    borderBottom: '1px solid var(--border-main)',
    padding: '10px',
  },
  empty: {
    color: 'var(--text-muted)',
    padding: '18px 10px',
    textAlign: 'center',
  },
};
