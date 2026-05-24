import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import { doc, getDoc, setDoc, collection, addDoc, getDocs, deleteDoc, query, where } from 'firebase/firestore';
import PinScreen from './components/PinScreen';
import Dashboard from './components/Dashboard';
import TransactionForm from './components/TransactionForm';
import TransactionList from './components/TransactionList';
import AdminPanel from './components/AdminPanel';

const DEFAULT_CATEGORIES = {
  income: ['Salary', 'Freelance', 'Other Income'],
  expense: ['Rent', 'Food', 'Transport', 'Health', 'Entertainment', 'Utilities', 'Other']
};

export default function App() {
  const [unlocked, setUnlocked] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [view, setView] = useState('dashboard');
  const [transactions, setTransactions] = useState([]);
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (unlocked && currentUser) {
      fetchTransactions();
      fetchCategories();
    }
  }, [unlocked, currentUser]);

  const fetchTransactions = async () => {
    setLoading(true);
    const q = query(collection(db, 'transactions'), where('userId', '==', currentUser));
    const snapshot = await getDocs(q);
    const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    setTransactions(data);
    setLoading(false);
  };

  const fetchCategories = async () => {
    const ref = doc(db, 'settings', 'categories');
    const snap = await getDoc(ref);
    if (snap.exists()) setCategories(snap.data());
    else await setDoc(ref, DEFAULT_CATEGORIES);
  };

  const addTransaction = async (transaction) => {
    const data = { ...transaction, userId: currentUser };
    const docRef = await addDoc(collection(db, 'transactions'), data);
    setTransactions(prev => [...prev, { id: docRef.id, ...data }]);
  };

  const deleteTransaction = async (id) => {
    await deleteDoc(doc(db, 'transactions', id));
    setTransactions(prev => prev.filter(t => t.id !== id));
  };

  const saveCategories = async (newCategories) => {
    await setDoc(doc(db, 'settings', 'categories'), newCategories);
    setCategories(newCategories);
  };

  const handleUnlock = (userId, adminStatus) => {
    setCurrentUser(userId);
    setIsAdmin(adminStatus);
    setUnlocked(true);
  };

  const handleLogout = () => {
    setUnlocked(false);
    setCurrentUser(null);
    setIsAdmin(false);
    setView('dashboard');
    setTransactions([]);
  };

  const filteredTransactions = transactions.filter(t => {
    const [year, month] = t.date.split('-').map(Number);
    return month - 1 === currentMonth && year === currentYear;
  });

  if (!unlocked) return <PinScreen onUnlock={handleUnlock} />;

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      <nav style={{
        background: '#6366f1', color: 'white', padding: '1rem 1.5rem',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        boxShadow: '0 2px 8px rgba(99,102,241,0.3)'
      }}>
        <span style={{ fontWeight: 700, fontSize: '1.2rem' }}>My Finances</span>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {['dashboard', 'add', 'transactions', 'categories'].map(v => (
            <button key={v} onClick={() => setView(v)} style={{
              background: view === v ? 'rgba(255,255,255,0.25)' : 'transparent',
              border: 'none', color: 'white', padding: '0.4rem 0.8rem',
              borderRadius: '6px', fontWeight: 500, fontSize: '0.85rem'
            }}>
              {v === 'add' ? '+ Add' : v === 'transactions' ? 'History' : v.charAt(0).toUpperCase() + v.slice(1)}
            </button>
          ))}
          {isAdmin && (
            <button onClick={() => setView('admin')} style={{
              background: view === 'admin' ? 'rgba(255,255,255,0.25)' : 'transparent',
              border: '1px solid rgba(255,255,255,0.4)', color: 'white', padding: '0.4rem 0.8rem',
              borderRadius: '6px', fontWeight: 500, fontSize: '0.85rem'
            }}>Admin</button>
          )}
          <button onClick={handleLogout} style={{
            background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.7)',
            padding: '0.4rem 0.8rem', borderRadius: '6px', fontSize: '0.85rem'
          }}>Exit</button>
        </div>
      </nav>

      <main style={{ maxWidth: '900px', margin: '0 auto', padding: '1.5rem' }}>
        {view === 'dashboard' && (
          <Dashboard
            transactions={filteredTransactions}
            currentMonth={currentMonth}
            currentYear={currentYear}
            onMonthChange={(m, y) => { setCurrentMonth(m); setCurrentYear(y); }}
          />
        )}
        {view === 'add' && (
          <TransactionForm
            categories={categories}
            onAdd={(t) => { addTransaction(t); setView('transactions'); }}
          />
        )}
        {view === 'transactions' && (
          <TransactionList
            transactions={filteredTransactions}
            allTransactions={transactions}
            onDelete={deleteTransaction}
            currentMonth={currentMonth}
            currentYear={currentYear}
            onMonthChange={(m, y) => { setCurrentMonth(m); setCurrentYear(y); }}
          />
        )}
        {view === 'categories' && (
          <CategoriesEditor categories={categories} onSave={saveCategories} />
        )}
        {view === 'admin' && isAdmin && (
          <AdminPanel />
        )}
      </main>
    </div>
  );
}

function CategoriesEditor({ categories, onSave }) {
  const [income, setIncome] = useState(categories.income.join(', '));
  const [expense, setExpense] = useState(categories.expense.join(', '));
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    onSave({
      income: income.split(',').map(s => s.trim()).filter(Boolean),
      expense: expense.split(',').map(s => s.trim()).filter(Boolean)
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div style={{ maxWidth: '500px', margin: '0 auto' }}>
      <h2 style={{ marginBottom: '1.5rem', color: '#1e293b' }}>Edit Categories</h2>
      <div style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, color: '#22c55e' }}>Income Categories</label>
        <input value={income} onChange={e => setIncome(e.target.value)}
          style={{ width: '100%', padding: '0.6rem', border: '1px solid #e2e8f0', borderRadius: '8px', marginBottom: '1rem' }}
          placeholder="Salary, Freelance, Other" />
        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, color: '#ef4444' }}>Expense Categories</label>
        <input value={expense} onChange={e => setExpense(e.target.value)}
          style={{ width: '100%', padding: '0.6rem', border: '1px solid #e2e8f0', borderRadius: '8px', marginBottom: '1.5rem' }}
          placeholder="Rent, Food, Transport" />
        <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '1rem' }}>Separate categories with commas</p>
        <button onClick={handleSave} style={{
          width: '100%', padding: '0.75rem', background: '#6366f1',
          color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600
        }}>
          {saved ? 'Saved!' : 'Save Categories'}
        </button>
      </div>
    </div>
  );
}
