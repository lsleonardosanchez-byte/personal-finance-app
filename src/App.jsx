import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import { doc, getDoc, setDoc, collection, addDoc, getDocs, deleteDoc, query, where } from 'firebase/firestore';
import PinScreen from './components/PinScreen';
import Dashboard from './components/Dashboard';
import TransactionForm from './components/TransactionForm';
import TransactionList from './components/TransactionList';
import AdminPanel from './components/AdminPanel';
import FixedExpenses from './components/FixedExpenses';

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
  const [selectedMonths, setSelectedMonths] = useState([new Date().getMonth()]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [txVersion, setTxVersion] = useState(0);

  useEffect(() => {
    if (unlocked && currentUser) {
      fetchTransactions();
      fetchCategories();
    }
  }, [unlocked, currentUser, txVersion]);

  const fetchTransactions = async () => {
    const q = query(collection(db, 'transactions'), where('userId', '==', currentUser));
    const snapshot = await getDocs(q);
    const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    setTransactions(data);
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

  if (!unlocked) return <PinScreen onUnlock={handleUnlock} />;

  const navItems = [
    { key: 'dashboard', label: 'Dashboard' },
    { key: 'add', label: '+ Add' },
    { key: 'transactions', label: 'History' },
    { key: 'fixed', label: 'Fixed' },
    { key: 'categories', label: 'Categories' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      <nav style={{
        background: '#6366f1', color: 'white', padding: '1rem 1.5rem',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        boxShadow: '0 2px 8px rgba(99,102,241,0.3)'
      }}>
        <span style={{ fontWeight: 700, fontSize: '1.2rem' }}>My Finances</span>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {navItems.map(({ key, label }) => (
            <button key={key} onClick={() => setView(key)} style={{
              background: view === key ? 'rgba(255,255,255,0.25)' : 'transparent',
              border: 'none', color: 'white', padding: '0.4rem 0.8rem',
              borderRadius: '6px', fontWeight: 500, fontSize: '0.85rem'
            }}>{label}</button>
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
            transactions={transactions}
            currentMonth={selectedMonths[0]}
            currentYear={selectedYear}
            selectedMonths={selectedMonths}
            selectedYear={selectedYear}
            onMonthsChange={setSelectedMonths}
            onYearChange={setSelectedYear}
            onMonthChange={(m, y) => { setSelectedMonths([m]); setSelectedYear(y); }}
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
            transactions={transactions}
            allTransactions={transactions}
            onDelete={deleteTransaction}
            selectedMonths={selectedMonths}
            selectedYear={selectedYear}
            onMonthsChange={setSelectedMonths}
            onYearChange={setSelectedYear}
            categories={categories}
          />
        )}
        {view === 'fixed' && (
          <FixedExpenses
            userId={currentUser}
            categories={categories}
            onTransactionChange={() => setTxVersion(v => v + 1)}
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
  const [incomeList, setIncomeList] = useState(categories.income);
  const [expenseList, setExpenseList] = useState(categories.expense);
  const [newIncome, setNewIncome] = useState('');
  const [newExpense, setNewExpense] = useState('');
  const [saved, setSaved] = useState(false);

  const addIncome = () => {
    const trimmed = newIncome.trim();
    if (!trimmed || incomeList.includes(trimmed)) return;
    setIncomeList(prev => [...prev, trimmed]);
    setNewIncome('');
  };

  const addExpense = () => {
    const trimmed = newExpense.trim();
    if (!trimmed || expenseList.includes(trimmed)) return;
    setExpenseList(prev => [...prev, trimmed]);
    setNewExpense('');
  };

  const handleSave = () => {
    onSave({ income: incomeList, expense: expenseList });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const tagStyle = (color) => ({
    display: 'inline-block', padding: '0.3rem 0.75rem', borderRadius: '20px',
    fontSize: '0.85rem', fontWeight: 500, margin: '0.25rem',
    background: color === 'green' ? '#f0fdf4' : '#fef2f2',
    color: color === 'green' ? '#22c55e' : '#ef4444',
    border: `1px solid ${color === 'green' ? '#bbf7d0' : '#fecaca'}`
  });

  const inputRow = { display: 'flex', gap: '0.5rem', marginTop: '0.75rem', marginBottom: '1rem' };
  const inputStyle = { flex: 1, padding: '0.6rem', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.9rem' };
  const addBtnStyle = (color) => ({
    padding: '0.6rem 1rem', border: 'none', borderRadius: '8px', fontWeight: 600,
    fontSize: '0.9rem', color: 'white',
    background: color === 'green' ? '#22c55e' : '#ef4444'
  });

  return (
    <div style={{ maxWidth: '500px', margin: '0 auto' }}>
      <h2 style={{ marginBottom: '1.5rem', color: '#1e293b' }}>Edit Categories</h2>
      <div style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
        <label style={{ display: 'block', fontWeight: 600, color: '#22c55e', marginBottom: '0.5rem' }}>Income Categories</label>
        <div>{incomeList.map(c => <span key={c} style={tagStyle('green')}>{c}</span>)}</div>
        <div style={inputRow}>
          <input value={newIncome} onChange={e => setNewIncome(e.target.value)} onKeyDown={e => e.key === 'Enter' && addIncome()} placeholder="New income category..." style={inputStyle} />
          <button onClick={addIncome} style={addBtnStyle('green')}>+ Add</button>
        </div>
        <hr style={{ border: 'none', borderTop: '1px solid #f1f5f9', margin: '0.5rem 0 1rem' }} />
        <label style={{ display: 'block', fontWeight: 600, color: '#ef4444', marginBottom: '0.5rem' }}>Expense Categories</label>
        <div>{expenseList.map(c => <span key={c} style={tagStyle('red')}>{c}</span>)}</div>
        <div style={inputRow}>
          <input value={newExpense} onChange={e => setNewExpense(e.target.value)} onKeyDown={e => e.key === 'Enter' && addExpense()} placeholder="New expense category..." style={inputStyle} />
          <button onClick={addExpense} style={addBtnStyle('red')}>+ Add</button>
        </div>
        <button onClick={handleSave} style={{ width: '100%', padding: '0.75rem', background: '#6366f1', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, marginTop: '0.5rem' }}>
          {saved ? 'Saved!' : 'Save Categories'}
        </button>
      </div>
    </div>
  );
}
