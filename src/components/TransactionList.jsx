import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { db } from '../firebase';
import { doc, updateDoc } from 'firebase/firestore';

const fmt = (n) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);

export default function TransactionList({ transactions, allTransactions, onDelete, selectedMonths, selectedYear, onMonthsChange, onYearChange, categories, t }) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [editValues, setEditValues] = useState({});
  const [localTransactions, setLocalTransactions] = useState(null);

  const months = selectedMonths && selectedMonths.length > 0 ? selectedMonths : [new Date().getMonth()];
  const year = selectedYear || new Date().getFullYear();
  const txList = localTransactions || transactions;

  const filtered = txList.filter(tr => {
    const [y, m] = tr.date.split('-').map(Number);
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

  const startEdit = (tr) => {
    setEditing(tr.id);
    setEditValues({ amount: tr.amount, category: tr.category, date: tr.date, note: tr.note || '', type: tr.type });
  };

  const cancelEdit = () => { setEditing(null); setEditValues({}); };

  const saveEdit = async (tr) => {
    const updated = { ...editValues, amount: Number(editValues.amount) };
    await updateDoc(doc(db, 'transactions', tr.id), updated);
    setLocalTransactions(prev => (prev || transactions).map(tx => tx.id === tr.id ? { ...tx, ...updated } : tx));
    setEditing(null);
    setEditValues({});
  };

  const exportToExcel = () => {
    const data = allTransactions.map(tr => ({ Date: tr.date, Type: tr.type, Category: tr.category, Amount: tr.amount, Note: tr.note || '' }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Transactions');
    XLSX.writeFile(wb, 'my-finances.xlsx');
  };

  const totalIncome = filtered.filter(tr => tr.type === 'income').reduce((s, tr) => s + tr.amount, 0);
  const totalExpenses = filtered.filter(tr => tr.type === 'expense').reduce((s, tr) => s + tr.amount, 0);

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
              {months.length === 1 ? t.months[months[0]] : `${months.length} ${t.monthsSelected}`} ▾
            </button>
            {dropdownOpen && (
              <div style={{ position: 'absolute', top: '110%', left: 0, background: 'white', border: '1px solid #e2e8f0', borderRadius: '10px', boxShadow: '0 4px 16px rgba(0,0,0,0.1)', zIndex: 100, minWidth: '180px', padding: '0.5rem' }}>
                {t.months.map((name, i) => (
                  <div key={i} onClick={() => toggleMonth(i)} style={{ padding: '0.5rem 0.75rem', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', background: months.includes(i) ? '#eef2ff' : 'transparent', color: months.includes(i) ? '#6366f1' : '#1e293b', fontWeight: months.includes(i) ? 600 : 400 }}>
                    <span style={{ width: '16px', height: '16px', borderRadius: '4px', border: `2px solid ${months.includes(i) ? '#6366f1' : '#cbd5e1'}`, background: months.includes(i) ? '#6366f1' : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {months.includes(i) && <span style={{ color: 'white', fontSize: '10px', fontWeight: 700 }}>✓</span>}
                    </span>
                    {name}
                  </div>
                ))}
                <div onClick={() => setDropdownOpen(false)} style={{ padding: '0.5rem 0.75rem', borderRadius: '6px', cursor: 'pointer', color: '#6366f1', fontWeight: 600, textAlign: 'center', borderTop: '1px solid #f1f5f9', marginTop: '0.25rem' }}>{t.done}</div>
              </div>
            )}
          </div>
        </div>
        <button onClick={exportToExcel} style={{ background: '#6366f1', color: 'white', border: 'none', borderRadius: '8px', padding: '0.5rem 1rem', fontWeight: 600, fontSize: '0.85rem' }}>{t.exportExcel}</button>
      </div>

      {/* Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        {[
          { label: t.income, value: totalIncome, color: '#22c55e', bg: '#f0fdf4' },
          { label: t.expenses, value: totalExpenses, color: '#ef4444', bg: '#fef2f2' },
          { label: t.balance, value: totalIncome - totalExpenses, color: totalIncome - totalExpenses >= 0 ? '#6366f1' : '#ef4444', bg: '#eef2ff' }
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
          <p>{t.noTransactions}</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {sorted.map(tr => {
            const isEditing = editing === tr.id;
            return (
              <div key={tr.id} style={{
                background: 'white', borderRadius: '10px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                borderLeft: `4px solid ${tr.type === 'income' ? '#22c55e' : '#ef4444'}`,
                overflow: 'hidden'
              }}>
                {!isEditing && (
                  <div style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontWeight: 600, color: '#1e293b' }}>{tr.category}</span>
                        <span style={{ fontSize: '0.7rem', padding: '0.15rem 0.5rem', borderRadius: '20px', fontWeight: 500, background: tr.type === 'income' ? '#f0fdf4' : '#fef2f2', color: tr.type === 'income' ? '#22c55e' : '#ef4444' }}>{tr.type === 'income' ? t.incomeBtn : t.expenseBtn}</span>
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.2rem' }}>
                        {tr.date}{tr.note ? ` · ${tr.note}` : ''}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span style={{ fontWeight: 700, color: tr.type === 'income' ? '#22c55e' : '#ef4444' }}>
                        {tr.type === 'income' ? '+' : '-'}{fmt(tr.amount)}
                      </span>
                      <button onClick={() => startEdit(tr)} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '0.3rem 0.6rem', fontSize: '0.8rem', cursor: 'pointer', color: '#6366f1', fontWeight: 500 }}>{t.edit}</button>
                      <button onClick={() => onDelete(tr.id)} style={{ background: 'none', border: 'none', color: '#cbd5e1', fontSize: '1.1rem', cursor: 'pointer' }}>🗑️</button>
                    </div>
                  </div>
                )}
                {isEditing && (
                  <div style={{ padding: '1rem 1.25rem', background: '#fafafe' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      <div>
                        <label style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500, display: 'block', marginBottom: '0.2rem' }}>{t.type}</label>
                        <select value={editValues.type} onChange={e => setEditValues(p => ({ ...p, type: e.target.value }))} style={inputStyle}>
                          <option value="expense">{t.expenseBtn}</option>
                          <option value="income">{t.incomeBtn}</option>
                        </select>
                      </div>
                      <div>
                        <label style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500, display: 'block', marginBottom: '0.2rem' }}>{t.amount}</label>
                        <input type="number" value={editValues.amount} onChange={e => setEditValues(p => ({ ...p, amount: e.target.value }))} style={inputStyle} />
                      </div>
                      <div>
                        <label style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500, display: 'block', marginBottom: '0.2rem' }}>{t.category}</label>
                        <select value={editValues.category} onChange={e => setEditValues(p => ({ ...p, category: e.target.value }))} style={inputStyle}>
                          {(categories?.[editValues.type] || []).map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                      <div>
                        <label style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500, display: 'block', marginBottom: '0.2rem' }}>{t.date}</label>
                        <input type="date" value={editValues.date} onChange={e => setEditValues(p => ({ ...p, date: e.target.value }))} style={inputStyle} />
                      </div>
                      <div style={{ gridColumn: '1 / -1' }}>
                        <label style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500, display: 'block', marginBottom: '0.2rem' }}>{t.note}</label>
                        <input type="text" value={editValues.note} onChange={e => setEditValues(p => ({ ...p, note: e.target.value }))} placeholder={t.notePlaceholder} style={inputStyle} />
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button onClick={() => saveEdit(tr)} style={{ flex: 1, padding: '0.6rem', background: '#6366f1', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>{t.save}</button>
                      <button onClick={cancelEdit} style={{ padding: '0.6rem 1rem', background: '#f1f5f9', color: '#64748b', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>{t.cancel}</button>
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
