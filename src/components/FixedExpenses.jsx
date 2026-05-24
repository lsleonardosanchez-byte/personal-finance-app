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
  const [payAmount, setPayAmount] = useState('');

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
    psnap.docs.forEach(d => { pmap[d.data().fixedId] = { paymentDocId: d.id, transactionId: d.data().transactionId, date: d.data().date, amount: d.data().amount }; });
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
            const paidAmount = payments[f.id]?.amount;
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
                      style={{ width: '18px', height: '18px', cursor: 'pointer', accentColo
