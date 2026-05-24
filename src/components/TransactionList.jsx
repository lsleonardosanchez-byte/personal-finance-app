import React from 'react';
import * as XLSX from 'xlsx';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const fmt = (n) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);

export default function TransactionList({ transactions, allTransactions, onDelete, currentMonth, currentYear, onMonthChange }) {

  const prevMonth = () => {
    if (currentMonth === 0) onMonthChange(11, currentYear - 1);
    else onMonthChange(currentMonth - 1, currentYear);
  };

  const nextMonth = () => {
    if (currentMonth === 11) onMonthChange(0, currentYear + 1);
    else onMonthChange(currentMonth + 1, currentYear);
  };

  const exportToExcel = () => {
    const data = allTransactions.map(t => ({
      Date: t.date,
      Type: t.type,
      Category: t.category,
      Amount: t.amount,
      Note: t.note || ''
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Transactions');
    XLSX.writeFile(wb, 'my-finances.xlsx');
  };

  const sorted = [...transactions].sort((a, b) => new Date(b.date) - new Date(a.date));

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button onClick={prevMonth} style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.4rem 0.8rem', color: '#64748b' }}>◀</button>
          <h2 style={{ fontWeight: 700, color: '#1e293b' }}>{MONTHS[currentMonth]} {currentYear}</h2>
          <button onClick={nextMonth} style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.4rem 0.8rem', color: '#64748b' }}>▶</button>
        </div>
        <button onClick={exportToExcel} style={{
          background: '#6366f1', color: 'white', border: 'none',
          borderRadius: '8px', padding: '0.5rem 1rem', fontWeight: 600, fontSize: '0.85rem'
        }}>
          📥 Export Excel
        </button>
      </div>

      {sorted.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', background: 'white', borderRadius: '12px', color: '#94a3b8' }}>
          <p style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📭</p>
          <p>No transactions this month</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {sorted.map(t => (
            <div key={t.id} style={{
              background: 'white', borderRadius: '10px', padding: '1rem 1.25rem',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
              borderLeft: `4px solid ${t.type === 'income' ? '#22c55e' : '#ef4444'}`
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontWeight: 600, color: '#1e293b' }}>{t.category}</span>
                  <span style={{
                    fontSize: '0.7rem', padding: '0.15rem 0.5rem', borderRadius: '20px', fontWeight: 500,
                    background: t.type === 'income' ? '#f0fdf4' : '#fef2f2',
                    color: t.type === 'income' ? '#22c55e' : '#ef4444'
                  }}>{t.type}</span>
                </div>
                <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.2rem' }}>
                  {t.date}{t.note ? ` · ${t.note}` : ''}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <span style={{ fontWeight: 700, color: t.type === 'income' ? '#22c55e' : '#ef4444' }}>
                  {t.type === 'income' ? '+' : '-'}{fmt(t.amount)}
                </span>
                <button onClick={() => onDelete(t.id)} style={{
                  background: 'none', border: 'none', color: '#cbd5e1',
                  fontSize: '1.1rem', padding: '0.2rem'
                }}>🗑️</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
