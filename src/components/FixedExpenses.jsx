import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs, addDoc, deleteDoc, doc, query, where, updateDoc } from 'firebase/firestore';

const fmt = (n) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export default function FixedExpenses({ userId, categories, onTransactionChange, t, selectedMonth, selectedYear }) {
  const [fixedList, setFixedList] = useState([]);
  const [payments, setPayments] = useState({});
  const [newName, setNewName] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [pendingPay, setPendingPay] = useState(null);
  const [payDate, setPayDate] = useState(today());
  const [payAmount, setPayAmount] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editValues, setEditValues] = useState({});

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const viewMonth = selectedMonth !== undefined ? selectedMonth : currentMonth;
  const viewYear = selectedYear !== undefined ? selectedYear : currentYear;
  const monthKey = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}`;

  const isCurrentMonth = viewMonth === currentMonth && viewYear === currentYear;
  const isPastMonth = viewYear < currentYear || (viewYear === currentYear && viewMonth < currentMonth);
  const isFutureMonth = viewYear > currentYear || (viewYear === currentYear && viewMonth > currentMonth);

  useEffect(() => { fetchData(); }, [userId, viewMonth, viewYear]);

  const fetchData = async () => {
    setLoading(true);
    const q = query(collection(db, 'fixedExpenses'), where('userId', '==', userId));
    const snap = await getDocs(q);
    const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    setFixedList(list);

    const pq = query(collection(db, 'fixedPayments'), where('userId', '==', userId), where('monthKey', '==', monthKey));
    const psnap = await getDocs(pq);
    const pmap = {};
    psnap.docs.forEach(d => { pmap[d.data().fixedId] = { paymentDocId: d.id, transactionId: d.data().transactionId, date: d.data().date, amount: d.data().amount }; });
    setPayments(pmap);
    setLoading(false);
  };

  const addFixed = async () => {
    if (!newName.trim()) return setError(t.errorCategory);
    if (!newAmount || isNaN(newAmount) || Number(newAmount) <= 0) return setError(t.errorAmount);
    if (!newCategory) return setError(t.errorCategory);
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

  const startEdit = (f) => {
    setEditingId(f.id);
    setEditValues({ name: f.name, amount: f.amount, category: f.category });
  };

  const saveEdit = async (id) => {
    const updated = { name: editValues.name.trim(), amount: Number(editValues.amount), category: editValues.category };
    await updateDoc(doc(db, 'fixedExpenses', id), updated);
    setFixedList(prev => prev.map(f => f.id === id ? { ...f, ...updated } : f));
    setEditingId(null);
    setEditValues({});
  };

  const confirmPaid = async (fixed) => {
    const finalAmount = payAmount && !isNaN(payAmount) && Number(payAmount) > 0 ? Number(payAmount) : fixed.amount;
    const txData = { userId, type: 'expense', amount: finalAmount, category: fixed.category, date: payDate, note: `Fixed: ${fixed.name}` };
    const txRef = await addDoc(collection(db, 'transactions'), txData);
    const pRef = await addDoc(collection(db, 'fixedPayments'), { userId, fixedId: fixed.id, monthKey, transactionId: txRef.id, date: payDate, amount: finalAmount });
    setPayments(prev => ({ ...prev, [fixed.id]: { paymentDocId: pRef.id, transactionId: txRef.id, date: payDate, amount: finalAmount } }));
    setPendingPay(null);
    setPayDate(today());
    setPayAmount('');
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
    if (!isCurrentMonth) return;
    if (payments[fixed.id]) {
      unmarkPaid(fixed.id);
    } else {
      setPendingPay(fixed.id);
      setPayDate(today());
      setPayAmount(String(fixed.amount));
    }
  };

  const totalFixed = fixedList.reduce((s, f) => s + f.amount, 0);
  const totalPaid = fixedList.filter(f => payments[f.id]).reduce((s, f) => s + (payments[f.id].amount || f.amount), 0);
  const totalPending = totalFixed - fixedList.filter(f => payments[f.id]).reduce((s, f) => s + f.amount, 0);

  const inputStyle = { padding: '0.6rem', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.9rem' };
  const editInputStyle = { padding: '0.4rem 0.6rem', border: '1px solid #6366f1', borderRadius: '6px', fontSize: '0.85rem', width: '100%' };

  const monthLabel = `${t.months[viewMonth]} ${viewYear}`;

  const statusBanner = isPastMonth ? (
    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '0.75rem 1rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      <span style={{ fontSize: '1rem' }}>📋</span>
      <p style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 500 }}>Historical view — {monthLabel}</p>
    </div>
  ) : isFutureMonth ? (
    <div style={{ background: '#eef2ff', border: '1px solid #c7d2fe', borderRadius: '10px', padding: '0.75rem 1rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      <span style={{ fontSize: '1rem' }}>🔮</span>
      <p style={{ fontSize: '0.85rem', color: '#6366f1', fontWeight: 500 }}>Future month — {monthLabel}. All items will reset when the month begins.</p>
    </div>
  ) : null;

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
        <h2 style={{ color: '#1e293b' }}>{t.fixedExpenses}</h2>
        <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#6366f1', background: '#eef2ff', padding: '0.3rem 0.75rem', borderRadius: '20px' }}>{monthLabel}</span>
      </div>
      <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '1.5rem' }}>{t.fixedExpensesHint}</p>

      {statusBanner}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        {[
          { label: t.totalFixed, value: totalFixed, color: '#6366f1', bg: '#eef2ff' },
          { label: t.paid, value: totalPaid, color: '#22c55e', bg: '#f0fdf4' },
          { label: t.pending, value: totalPending, color: '#ef4444', bg: '#fef2f2' }
        ].map(card => (
          <div key={card.label} style={{ background: card.bg, borderRadius: '12px', padding: '1rem', textAlign: 'center' }}>
            <p style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.4rem', fontWeight: 500 }}>{card.label}</p>
            <p style={{ fontSize: '0.95rem', fontWeight: 700, color: card.color }}>{fmt(card.value)}</p>
          </div>
        ))}
      </div>

      {loading ? (
        <p style={{ color: '#94a3b8', textAlign: 'center', padding: '2rem 0' }}>{t.loading}</p>
      ) : fixedList.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '2rem', background: 'white', borderRadius: '12px', color: '#94a3b8', marginBottom: '1.5rem' }}>
          <p style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>📋</p>
          <p>{t.noFixed}</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.5rem' }}>
          {fixedList.map(f => {
            const isPaid = !!payments[f.id];
            const isPickingDate = pendingPay === f.id;
            const isEditing = editingId === f.id;
            const paidAmount = payments[f.id]?.amount;

            return (
              <div key={f.id} style={{
                background: 'white', borderRadius: '10px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                borderLeft: `4px solid ${isPaid ? '#22c55e' : isPickingDate ? '#6366f1' : isEditing ? '#f59e0b' : isFutureMonth ? '#c7d2fe' : '#e2e8f0'}`,
                overflow: 'hidden',
                opacity: isFutureMonth ? 0.75 : 1
              }}>
                {!isEditing && (
                  <div style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1 }}>
                      <input
                        type="checkbox"
                        checked={isPaid}
                        onChange={() => handleCheckbox(f)}
                        disabled={!isCurrentMonth}
                        style={{ width: '18px', height: '18px', cursor: isCurrentMonth ? 'pointer' : 'not-allowed', accentColor: '#22c55e', opacity: isCurrentMonth ? 1 : 0.4 }}
                      />
                      <div>
                        <p style={{ fontWeight: 600, color: isPaid ? '#94a3b8' : '#1e293b', textDecoration: isPaid ? 'line-through' : 'none' }}>{f.name}</p>
                        <p style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{f.category}</p>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ fontWeight: 700, color: isPaid ? '#22c55e' : '#ef4444' }}>
                          {isPaid && paidAmount !== f.amount ? fmt(paidAmount) : fmt(f.amount)}
                        </p>
                        {isPaid && paidAmount !== f.amount && (
                          <p style={{ fontSize: '0.75rem', color: '#94a3b8', textDecoration: 'line-through' }}>{fmt(f.amount)}</p>
                        )}
                      </div>
                      {isPaid && (
                        <span style={{ fontSize: '0.75rem', background: '#f0fdf4', color: '#22c55e', padding: '0.2rem 0.5rem', borderRadius: '20px', fontWeight: 600, whiteSpace: 'nowrap' }}>
                          {t.paid} {payments[f.id]?.date ? `· ${payments[f.id].date}` : ''}
                        </span>
                      )}
                      {!isPaid && (isCurrentMonth || isFutureMonth) && (
                        <button onClick={() => startEdit(f)} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '0.3rem 0.6rem', fontSize: '0.8rem', cursor: 'pointer', color: '#6366f1', fontWeight: 500 }}>{t.edit}</button>
                      )}
                      {(isCurrentMonth || isFutureMonth) && (
                        <button onClick={() => deleteFixed(f.id)} style={{ background: 'none', border: 'none', color: '#cbd5e1', fontSize: '1.1rem', cursor: 'pointer' }}>🗑️</button>
                      )}
                    </div>
                  </div>
                )}

                {isEditing && (
                  <div style={{ padding: '1rem 1.25rem', background: '#fffbeb' }}>
                    <p style={{ fontSize: '0.85rem', color: '#f59e0b', fontWeight: 500, marginBottom: '0.75rem' }}>{t.editFixed}</p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.75rem' }}>
                      <div style={{ gridColumn: '1 / -1' }}>
                        <label style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500, display: 'block', marginBottom: '0.2rem' }}>{t.namePlaceholder}</label>
                        <input type="text" value={editValues.name} onChange={e => setEditValues(p => ({ ...p, name: e.target.value }))} style={editInputStyle} />
                      </div>
                      <div>
                        <label style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500, display: 'block', marginBottom: '0.2rem' }}>{t.defaultAmount}</label>
                        <input type="number" value={editValues.amount} onChange={e => setEditValues(p => ({ ...p, amount: e.target.value }))} style={editInputStyle} />
                      </div>
                      <div>
                        <label style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500, display: 'block', marginBottom: '0.2rem' }}>{t.category}</label>
                        <select value={editValues.category} onChange={e => setEditValues(p => ({ ...p, category: e.target.value }))} style={editInputStyle}>
                          {(categories?.expense || []).map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button onClick={() => saveEdit(f.id)} style={{ flex: 1, padding: '0.6rem', background: '#6366f1', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>{t.save}</button>
                      <button onClick={() => setEditingId(null)} style={{ padding: '0.6rem 1rem', background: '#f1f5f9', color: '#64748b', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>{t.cancel}</button>
                    </div>
                  </div>
                )}

                {isPickingDate && !isEditing && (
                  <div style={{ padding: '0.75rem 1.25rem 1rem', borderTop: '1px solid #f1f5f9', background: '#f8fafc' }}>
                    <p style={{ fontSize: '0.85rem', color: '#6366f1', fontWeight: 500, marginBottom: '0.75rem' }}>{t.confirmPaymentDetails}</p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.75rem' }}>
                      <div>
                        <label style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500, display: 'block', marginBottom: '0.3rem' }}>{t.paymentDate}</label>
                        <input type="date" value={payDate} onChange={e => setPayDate(e.target.value)} style={{ ...inputStyle, width: '100%' }} />
                      </div>
                      <div>
                        <label style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500, display: 'block', marginBottom: '0.3rem' }}>{t.amount}</label>
                        <input type="number" value={payAmount} onChange={e => setPayAmount(e.target.value)} style={{ ...inputStyle, width: '100%' }} />
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button onClick={() => confirmPaid(f)} style={{ flex: 1, padding: '0.6rem', background: '#22c55e', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>{t.confirmPayment}</button>
                      <button onClick={() => { setPendingPay(null); setPayAmount(''); }} style={{ padding: '0.6rem 1rem', background: '#f1f5f9', color: '#64748b', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>{t.cancel}</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add new — only show for current month */}
      {isCurrentMonth && (
        <div style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#1e293b', marginBottom: '1rem' }}>{t.addFixedExpense}</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <input value={newName} onChange={e => setNewName(e.target.value)} placeholder={t.namePlaceholder} style={{ ...inputStyle, gridColumn: '1 / -1' }} />
            <input value={newAmount} onChange={e => setNewAmount(e.target.value)} placeholder={t.amountPlaceholder} type="number" style={inputStyle} />
            <select value={newCategory} onChange={e => setNewCategory(e.target.value)} style={inputStyle}>
              <option value="">{t.categoryPlaceholder}</option>
              {(categories?.expense || []).map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          {error && <p style={{ color: '#ef4444', fontSize: '0.85rem', marginBottom: '0.75rem' }}>{error}</p>}
          <button onClick={addFixed} style={{ width: '100%', padding: '0.75rem', background: '#6366f1', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600 }}>
            + {t.addFixedExpense}
          </button>
        </div>
      )}
    </div>
  );
}
