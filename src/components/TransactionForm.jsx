import React, { useState } from 'react';

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export default function TransactionForm({ categories, onAdd, t }) {
  const [type, setType] = useState('expense');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [date, setDate] = useState(today());
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = () => {
    if (!amount || isNaN(amount) || Number(amount) <= 0) return setError(t.errorAmount);
    if (!category) return setError(t.errorCategory);
    if (!date) return setError(t.errorDate);
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
      <h2 style={{ marginBottom: '1.5rem', color: '#1e293b' }}>{t.addTransaction}</h2>
      <div style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>

        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
          {['expense', 'income'].map(tp => (
            <button key={tp} onClick={() => { setType(tp); setCategory(''); }} style={{
              flex: 1, padding: '0.6rem', borderRadius: '8px', fontWeight: 600,
              fontSize: '0.95rem', border: 'none',
              background: type === tp ? (tp === 'income' ? '#22c55e' : '#ef4444') : '#f1f5f9',
              color: type === tp ? 'white' : '#64748b'
            }}>
              {tp === 'income' ? `💚 ${t.incomeBtn}` : `❤️ ${t.expenseBtn}`}
            </button>
          ))}
        </div>

        <label style={{ fontSize: '0.85rem', fontWeight: 500, color: '#64748b', display: 'block', marginBottom: '0.4rem' }}>{t.amount}</label>
        <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0" style={inputStyle} />

        <label style={{ fontSize: '0.85rem', fontWeight: 500, color: '#64748b', display: 'block', marginBottom: '0.4rem' }}>{t.category}</label>
        <select value={category} onChange={e => setCategory(e.target.value)} style={inputStyle}>
          <option value="">{t.selectCategory}</option>
          {(categories[type] || []).map(c => <option key={c} value={c}>{c}</option>)}
        </select>

        <label style={{ fontSize: '0.85rem', fontWeight: 500, color: '#64748b', display: 'block', marginBottom: '0.4rem' }}>{t.date}</label>
        <input type="date" value={date} onChange={e => setDate(e.target.value)} style={inputStyle} />

        <label style={{ fontSize: '0.85rem', fontWeight: 500, color: '#64748b', display: 'block', marginBottom: '0.4rem' }}>{t.note}</label>
        <input type="text" value={note} onChange={e => setNote(e.target.value)} placeholder={t.notePlaceholder} style={inputStyle} />

        {error && <p style={{ color: '#ef4444', fontSize: '0.85rem', marginBottom: '1rem' }}>{error}</p>}

        <button onClick={handleSubmit} style={{
          width: '100%', padding: '0.8rem', background: '#6366f1',
          color: 'white', border: 'none', borderRadius: '8px',
          fontWeight: 600, fontSize: '1rem'
        }}>
          {t.saveTransaction}
        </button>
      </div>
    </div>
  );
}
