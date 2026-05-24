import React, { useState } from 'react';

const today = () => {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

export default function TransactionForm({ categories, onAdd }) {
  const [type, setType] = useState('expense');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [date, setDate] = useState(today());
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = () => {
    if (!amount || isNaN(amount) || Number(amount) <= 0) return setError('Enter a valid amount');
    if (!category) return setError('Select a category');
    if (!date) return setError('Select a date');
    setError('');
    onAdd({ type, amount: Number(amount), category, date, note });
    setAmount('');
    setCategory('');
    setDate(today());
    setNote('');
  };

  const inputStyle = {
    width: '100%', padding: '0.7rem', border: '1px solid #e2e8f0',
    borderRadius: '8px', fontSize: '1rem', color: '#1e293b',
    background: 'white', marginBottom: '1rem'
  };

  return (
    <div style={{ maxWidth: '480px', margin: '0 auto' }}>
      <h2 style={{ marginBottom: '1.5rem', color: '#1e293b' }}>Add Transaction</h2>
      <div style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>

        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
          {['expense', 'income'].map(t => (
            <button key={t} onClick={() => { setType(t); setCategory(''); }} style={{
              flex: 1, padding: '0.6rem', borderRadius: '8px', fontWeight: 600,
              fontSize: '0.95rem', border: 'none',
              background: type === t ? (t === 'income' ? '#22c55e' : '#ef4444') : '#f1f5f9',
              color: type === t ? 'white' : '#64748b'
            }}>
              {t === 'income' ? '💚 Income' : '❤️ Expense'}
            </button>
          ))}
        </div>

        <label style={{ fontSize: '0.85rem', fontWeight: 500, color: '#64748b', display: 'block', marginBottom: '0.4rem' }}>Amount (COP)</label>
        <input
          type="number" value={amount} onChange={e => setAmount(e.target.value)}
          placeholder="0" style={inputStyle}
        />

        <label style={{ fontSize: '0.85rem', fontWeight: 500, color: '#64748b', display: 'block', marginBottom: '0.4rem' }}>Category</label>
        <select value={category} onChange={e => setCategory(e.target.value)} style={inputStyle}>
          <option value="">Select category...</option>
          {(categories[type] || []).map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        <label style={{ fontSize: '0.85rem', fontWeight: 500, color: '#64748b', display: 'block', marginBottom: '0.4rem' }}>Date</label>
        <input
          type="date" value={date} onChange={e => setDate(e.target.value)}
          style={inputStyle}
        />

        <label style={{ fontSize: '0.85rem', fontWeight: 500, color: '#64748b', display: 'block', marginBottom: '0.4rem' }}>Note (optional)</label>
        <input
          type="text" value={note} onChange={e => setNote(e.target.value)}
          placeholder="Add a note..." style={inputStyle}
        />

        {error && <p style={{ color: '#ef4444', fontSize: '0.85rem', marginBottom: '1rem' }}>{error}</p>}

        <button onClick={handleSubmit} style={{
          width: '100%', padding: '0.8rem', background: '#6366f1',
          color: 'white', border: 'none', borderRadius: '8px',
          fontWeight: 600, fontSize: '1rem'
        }}>
          Save Transaction
        </button>
      </div>
    </div>
  );
}
