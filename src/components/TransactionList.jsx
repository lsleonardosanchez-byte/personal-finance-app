import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { db } from '../firebase';
import { doc, updateDoc } from 'firebase/firestore';

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const fmt = (n) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);

export default function TransactionList({ transactions, allTransactions, onDelete, selectedMonths, selectedYear, onMonthsChange, onYearChange, categories }) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [editValues, setEditValues] = useState({});
  const [localTransactions, setLocalTransactions] = useState(null);

  const months = selectedMonths && selectedMonths.length > 0 ? selectedMonths : [new Date().getMonth()];
  const year = selectedYear || new Date().getFullYear();

  const txList = localTransactions || transactions;

  const filtered = txList.filter(t => {
    const [y, m] = t.date.split('-').map(Number);
    return y === year && months.includes(m - 1);
  });

  const sorted = [...filtered].sort((a, b) => new Date(b.date) - new Date(a.date));

  const toggleMonth = (m) => {
    if (months.includes(m)) {
      if (months.length === 1) return;
      onMonthsChange(months.filter(x => x !== m));
    } else {
      onMonthsChange([...months, m].sort((a, b) => a - b));
    }
  };

  const startEdit = (t) => {
    setEditing(t.id);
    setEditValues({ amount: t.amount, category: t.category, date: t.date, note: t.note || '', type: t.type });
  };

  const cancelEdit = () => { setEditing(null); setEditValues({}); };

  const saveEdit = async (t) => {
    const updated = { ...editValues, amount: Number(editValues.amount) };
    await updateDoc(doc(db, 'transactions', t.id), updated);
    setLocalTransactions(prev => (prev || transactions).map(tx => tx.id === t.id ? { ...tx, ...updated } : tx));
    setEditing(null);
    setEditValues({});
  };

  const exportToExcel = () => {
    const data = allTransactions.map(t => ({ Date: t.date, Type: t.type, Category: t.category, Amount: t.amount, Note: t.note || '' }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Transactions');
    XLSX.writeFile(wb, 'my-finances.xlsx');
  };

  const totalIncome = filtered.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalExpenses = filtered.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

  const inputStyle = { padding: '0.4rem 0.6rem', border: '1px solid #6366f1', borderRadius: '6px', fontSize: '0.85rem', width: '100%' };

  return (
    <div>
      {/* Filter bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <select value={year} onChange={e => onYearChange(Number(e.target.value))} style={{ padding: '0.5rem 0.75rem', border: '1px solid #e2e8f0', borderRadius: '8px', fontWeight: 600, color: '#1e293b', background: 'white' }}>
            {[2023,2024,2025,2026,2027].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <div style={{ position: 'relative' }}>
            <button onClick={() => setDropdownOpen(o => !o)} style={{ padding: '0.5rem 1rem', border: '1px solid #e2e8f0', borderRadius: '8px', background: 'white', fontWeight: 500, color: '#1e293b', cursor: 'pointer' }}>
              {months.length === 1 ? MONTH_NAMES[months[0]] : `${months.length} months`} ▾
            </button>
            {dropdownOpen && (
              <div style={{ position: 'absolute', top: '110%', left: 0, background: 'white', border: '1px solid #e2e8f0', borderRadius: '10px', boxShadow: '0 4px 16px rgba(0,0,0,0.1)', zIndex: 100, minWidth: '180px', padding: '0.5rem' }}>
                {MONTH_NAMES.map((name, i) => (
                  <div key={i} onClick={() => toggleMonth(i)} style={{ padding: '0.5rem 0.75rem', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', background: months.includes(i) ? '#eef2ff' : 'transparent', color: months.includes(i) ? '#6366f1' : '#1e293b', fontWeight: months.includes(i) ? 600 : 400 }}>
                    <span style={{ width: '16px', height: '16px', borderRadius: '4px', border: `2px solid ${months.includes(i) ? '#6366f1' : '#cbd5e1'}`, background: months.includes(i) ? '#6366f1' : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {months.includes(i) && <span style={{ color: 'white', fontSize: '10px', fontWeight: 700 }}>✓</span>}
                    </span>
                    {name}
                  </div>
                ))}
                <div onClick={() => setDropdownOpen(false)} style={{ padding: '0.5rem 0.75rem', borderRadius: '6px', cursor: 'pointer', color: '#6366f1', fontWeight: 600, textAlign: 'center', borderTop: '1px solid #f1f5f9', marginTop: '0.25rem' }}>Done</div>
              </div>
            )}
          </div>
        </div>
        <button onClick={exportToExcel} style={{ background: '#6366f1', color: 'white', border: 'none', borderRadius: '8px', padding: '0.5rem 1rem', fontWeight: 600, fontSize: '0.85rem' }}>Export Excel</button>
      </div>

      {/* Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Income', value: totalIncome, color: '#22c55e', bg: '#f0fdf4' },
          { label: 'Expenses', value: totalExpenses, color: '#ef4444', bg: '#fef2f2' },
          { label: 'Balance', value: totalIncome - totalExpenses, color: totalIncome - totalExpenses >= 0 ? '#6366f1' : '#ef4444', bg: '#eef2ff' }
        ].map(card => (
          <div key={card.label} style={{ background: card.bg, borderRadius: '12px', padding: '1rem', textAlign: 'center' }}>
            <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '0.4rem', fontWeight: 500 }}>{card.label}</p>
            <p style={{ fontSize: '0.95rem', fontWeight: 700, color: card.color }}>{fmt(card.value)}</p>
          </div>
        ))}
      </div>

      {/* Transaction list */}
      {sorted.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', background: 'white', borderRadius: '12px', color: '#94a3b8' }}>
          <p style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📭</p>
          <p>No transactions for selected period</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {sorted.map(t => {
            const isEditing = editing === t.id;
            return (
              <div key={t.id} style={{
                background: 'white', borderRadius: '10px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                borderLeft: `4px solid ${t.type === 'income' ? '#22c55e' : '#ef4444'}`,
                overflow: 'hidden'
              }}>
                {/* Normal view */}
                {!isEditing && (
                  <div style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontWeight: 600, color: '#1e293b' }}>{t.category}</span>
                        <span style={{ fontSize: '0.7rem', padding: '0.15rem 0.5rem', borderRadius: '20px', fontWeight: 500, background: t.type === 'income' ? '#f0fdf4' : '#fef2f2', color: t.type === 'income' ? '#22c55e' : '#ef4444' }}>{t.type}</span>
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.2rem' }}>
                        {t.date}{t.note ? ` · ${t.note}` : ''}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span style={{ fontWeight: 700, color: t.type === 'income' ? '#22c55e' : '#ef4444' }}>
                        {t.type === 'income' ? '+' : '-'}{fmt(t.amount)}
                      </span>
                      <button onClick={() => startEdit(t)} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '0.3rem 0.6rem', fontSize: '0.8rem', cursor: 'pointer', color: '#6366f1', fontWeight: 500 }}>Edit</button>
                      <button onClick={() => onDelete(t.id)} style={{ background: 'none', border: 'none', color: '#cbd5e1', fontSize: '1.1rem', cursor: 'pointer' }}>🗑️</button>
                    </div>
                  </div>
                )}

                {/* Edit view */}
                {isEditing && (
                  <div style={{ padding: '1rem 1.25rem', background: '#fafafe' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      <div>
                        <label style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500, display: 'block', marginBottom: '0.2rem' }}>Type</label>
                        <select value={editValues.type} onChange={e => setEditValues(p => ({ ...p, type: e.target.value }))} style={inputStyle}>
                          <option value="expense">Expense</option>
                          <option value="income">Income</option>
                        </select>
                      </div>
                      <div>
                        <label style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500, display: 'block', marginBottom: '0.2rem' }}>Amount (COP)</label>
                        <input type="number" value={editValues.amount} onChange={e => setEditValues(p => ({ ...p, amount: e.target.value }))} style={inputStyle} />
                      </div>
                      <div>
                        <label style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500, display: 'block', marginBottom: '0.2rem' }}>Category</label>
                        <select value={editValues.category} onChange={e => setEditValues(p => ({ ...p, category: e.target.value }))} style={inputStyle}>
                          {(categories?.[editValues.type] || []).map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                      <div>
                        <label style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500, display: 'block', marginBottom: '0.2rem' }}>Date</label>
                        <input type="date" value={editValues.date} onChange={e => setEditValues(p => ({ ...p, date: e.target.value }))} style={inputStyle} />
                      </div>
                      <div style={{ gridColumn: '1 / -1' }}>
                        <label style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500, display: 'block', marginBottom: '0.2rem' }}>Note</label>
                        <input type="text" value={editValues.note} onChange={e => setEditValues(p => ({ ...p, note: e.target.value }))} placeholder="Optional note" style={inputStyle} />
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button onClick={() => saveEdit(t)} style={{ flex: 1, padding: '0.6rem', background: '#6366f1', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>Save</button>
                      <button onClick={cancelEdit} style={{ padding: '0.6rem 1rem', background: '#f1f5f9', color: '#64748b', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
