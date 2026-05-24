import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs, addDoc, deleteDoc, doc, query, where } from 'firebase/firestore';

const fmt = (n) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export default function FixedExpenses({ userId, categories, onTransactionChange }) {
  const [fixedList, setFixedList] = useState([]);
  const [payments, setPayments] = useState({});
  const [newName, setNewName] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [pendingPay, setPendingPay] = useState(null);
  const [payDate, setPayDate] = useState(today());

  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const monthKey = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;

  useEffect(() => { fetchData(); }, [userId]);

  const fetchData = async () => {
    setLoading(true);
    const q = query(collection(db, 'fixedExpenses'), where('userId', '==', userId));
    const snap = await getDocs(q);
    const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    setFixedList(list);

    const pq = query(collection(db, 'fixedPayments'), where('userId', '==', userId), where('monthKey', '==', monthKey));
    const psnap = await getDocs(pq);
    const pmap = {};
    psnap.docs.forEach(d => { pmap[d.data().fixedId] = { paymentDocId: d.id, transactionId: d.data().transactionId }; });
    setPayments(pmap);
    setLoading(false);
  };

  const addFixed = async () => {
    if (!newName.trim()) return setError('Enter a name');
    if (!newAmount || isNaN(newAmount) || Number(newAmount) <= 0) return setError('Enter a valid amount');
    if (!newCategory) return setError('Select a category');
    setError('');
    const data = { userId, name: newName.trim(), amount: Number(newAmount), category: newCategory };
    const ref = await addDoc(collection(db, 'fixedExpenses'), data);
    setFixedList(prev => [...prev, { id: ref.id, ...data }]);
    setNewName('');
    setNewAmount('');
    setNewCategory('');
  };

  const deleteFixed = async (id) => {
    if (payments[id]) await unmarkPaid(id, true);
    await deleteDoc(doc(db, 'fixedExpenses', id));
    setFixedList(prev => prev.filter(f => f.id !== id));
  };

  const confirmPaid = async (fixed) => {
    const txData = { userId, type: 'expense', amount: fixed.amount, category: fixed.category, date: payDate, note: `Fixed: ${fixed.name}` };
    const txRef = await addDoc(collection(db, 'transactions'), txData);
    const pRef = await addDoc(collection(db, 'fixedPayments'), { userId, fixedId: fixed.id, monthKey, transactionId: txRef.id, date: payDate });
    setPayments(prev => ({ ...prev, [fixed.id]: { paymentDocId: pRef.id, transactionId: txRef.id } }));
    setPendingPay(null);
    setPayDate(today());
    onTransactionChange();
  };

  const unmarkPaid = async (fixedId, skipStateUpdate = false) => {
    const payment = payments[fixedId];
    if (!payment) return;
    await deleteDoc(doc(db, 'transactions', payment.transactionId));
    await deleteDoc(doc(db, 'fixedPayments', payment.paymentDocId));
    if (!skipStateUpdate) {
      setPayments(prev => { const n = { ...prev }; delete n[fixedId]; return n; });
      onTransactionChange();
    }
  };

  const handleCheckbox = (fixed) => {
    if (payments[fixed.id]) {
      unmarkPaid(fixed.id);
    } else {
      setPendingPay(fixed.id);
      setPayDate(today());
    }
  };

  const totalFixed = fixedList.reduce((s, f) => s + f.amount, 0);
  const totalPaid = fixedList.filter(f => payments[f.id]).reduce((s, f) => s + f.amount, 0);
  const totalPending = totalFixed - totalPaid;

  const inputStyle = { padding: '0.6rem', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.9rem' };

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto' }}>
      <h2 style={{ marginBottom: '0.5rem', color: '#1e293b' }}>Fixed Expenses</h2>
      <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
        Resets automatically every 1st of the month
      </p>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Total Fixed', value: totalFixed, color: '#6366f1', bg: '#eef2ff' },
          { label: 'Paid', value: totalPaid, color: '#22c55e', bg: '#f0fdf4' },
          { label: 'Pending', value: totalPending, color: '#ef4444', bg: '#fef2f2' }
        ].map(card => (
          <div key={card.label} style={{ background: card.bg, borderRadius: '12px', padding: '1rem', textAlign: 'center' }}>
            <p style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.4rem', fontWeight: 500 }}>{card.label}</p>
            <p style={{ fontSize: '0.95rem', fontWeight: 700, color: card.color }}>{fmt(card.value)}</p>
          </div>
        ))}
      </div>

      {/* Fixed expenses list */}
      {loading ? (
        <p style={{ color: '#94a3b8', textAlign: 'center', padding: '2rem 0' }}>Loading...</p>
      ) : fixedList.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '2rem', background: 'white', borderRadius: '12px', color: '#94a3b8', marginBottom: '1.5rem' }}>
          <p style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>📋</p>
          <p>No fixed expenses yet. Add your first one below!</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.5rem' }}>
          {fixedList.map(f => {
            const isPaid = !!payments[f.id];
            const isPickingDate = pendingPay === f.id;
            return (
              <div key={f.id} style={{
                background: 'white', borderRadius: '10px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                borderLeft: `4px solid ${isPaid ? '#22c55e' : isPickingDate ? '#6366f1' : '#e2e8f0'}`,
                overflow: 'hidden'
              }}>
                {/* Main row */}
                <div style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1 }}>
                    <input
                      type="checkbox"
                      checked={isPaid}
                      onChange={() => handleCheckbox(f)}
                      style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#22c55e' }}
                    />
                    <div>
                      <p style={{ fontWeight: 600, color: isPaid ? '#94a3b8' : '#1e293b', textDecoration: isPaid ? 'line-through' : 'none' }}>{f.name}</p>
                      <p style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{f.category}</p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <span style={{ fontWeight: 700, color: isPaid ? '#22c55e' : '#ef4444' }}>{fmt(f.amount)}</span>
                    {isPaid && (
                      <span style={{ fontSize: '0.75rem', background: '#f0fdf4', color: '#22c55e', padding: '0.2rem 0.5rem', borderRadius: '20px', fontWeight: 600 }}>
                        Paid {payments[f.id]?.date ? `· ${payments[f.id].date}` : ''}
                      </span>
                    )}
                    <button onClick={() => deleteFixed(f.id)} style={{ background: 'none', border: 'none', color: '#cbd5e1', fontSize: '1.1rem', cursor: 'pointer' }}>🗑️</button>
                  </div>
                </div>

                {/* Date picker - slides in when checkbox clicked */}
                {isPickingDate && (
                  <div style={{ padding: '0.75rem 1.25rem 1rem', borderTop: '1px solid #f1f5f9', background: '#f8fafc' }}>
                    <p style={{ fontSize: '0.85rem', color: '#6366f1', fontWeight: 500, marginBottom: '0.5rem' }}>Select payment date:</p>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <input
                        type="date"
                        value={payDate}
                        onChange={e => setPayDate(e.target.value)}
                        style={{ ...inputStyle, flex: 1 }}
                      />
                      <button onClick={() => confirmPaid(f)} style={{ padding: '0.6rem 1rem', background: '#22c55e', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer' }}>
                        Confirm
                      </button>
                      <button onClick={() => setPendingPay(null)} style={{ padding: '0.6rem 1rem', background: '#f1f5f9', color: '#64748b', border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer' }}>
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add new fixed expense */}
      <div style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
        <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#1e293b', marginBottom: '1rem' }}>Add Fixed Expense</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
          <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Name (e.g. Rent)" style={{ ...inputStyle, gridColumn: '1 / -1' }} />
          <input value={newAmount} onChange={e => setNewAmount(e.target.value)} placeholder="Amount" type="number" style={inputStyle} />
          <select value={newCategory} onChange={e => setNewCategory(e.target.value)} style={inputStyle}>
            <option value="">Category...</option>
            {(categories.expense || []).map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        {error && <p style={{ color: '#ef4444', fontSize: '0.85rem', marginBottom: '0.75rem' }}>{error}</p>}
        <button onClick={addFixed} style={{ width: '100%', padding: '0.75rem', background: '#6366f1', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600 }}>
          + Add Fixed Expense
        </button>
      </div>
    </div>
  );
}
