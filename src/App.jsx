import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import { doc, getDoc, setDoc, collection, addDoc, getDocs, deleteDoc, query, where, updateDoc } from 'firebase/firestore';
import PinScreen from './components/PinScreen';
import Dashboard from './components/Dashboard';
import TransactionForm from './components/TransactionForm';
import TransactionList from './components/TransactionList';
import AdminPanel from './components/AdminPanel';
import FixedExpenses from './components/FixedExpenses';
import lang from './lang';

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
  const [language, setLanguage] = useState('en');

  const t = lang[language];

  useEffect(() => {
    if (unlocked && currentUser) {
      fetchTransactions();
      fetchCategories();
      fetchLanguage();
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

  const fetchLanguage = async () => {
    const ref = doc(db, 'users', currentUser);
    const snap = await getDoc(ref);
    if (snap.exists() && snap.data().language) {
      setLanguage(snap.data().language);
    }
  };

  const toggleLanguage = async () => {
    const newLang = language === 'en' ? 'es' : 'en';
    setLanguage(newLang);
    await updateDoc(doc(db, 'users', currentUser), { language: newLang });
  };

  const addTransaction = async (transaction) => {
    const data = { ...transaction, userId: currentUser };
    const docRef = await addDoc(collection(db, 'transactions'), data);
    setTransactions(prev => [...prev, { id: docRef.id, ...data }]);
  };

  const deleteTransaction = async (id) => {
    await deleteDoc(doc(db, 'transactions', id));
    setTransactions(prev => prev.filter(tx => tx.id !== id));
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
    setLanguage('en');
  };

  if (!unlocked) return <PinScreen onUnlock={handleUnlock} />;

  const navItems = [
    { key: 'dashboard', label: t.dashboard },
    { key: 'add', label: t.add },
    { key: 'transactions', label: t.history },
    { key: 'fixed', label: t.fixed },
    { key: 'categories', label: t.categories },
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      <nav style={{
        background: '#6366f1', color: 'white', padding: '1rem 1.5rem',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        boxShadow: '0 2px 8px rgba(99,102,241,0.3)'
      }}>
        <span style={{ fontWeight: 700, fontSize: '1.2rem' }}>{t.appName}</span>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
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
            }}>{t.admin}</button>
          )}
          <button onClick={toggleLanguage} style={{
            background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)',
            color: 'white', padding: '0.4rem 0.8rem', borderRadius: '6px',
            fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer'
          }}>
            {language === 'en' ? '🇨🇴 ES' : '🇺🇸 EN'}
          </button>
          <button onClick={handleLogout} style={{
            background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.7)',
            padding: '0.4rem 0.8rem', borderRadius: '6px', fontSize: '0.85rem'
          }}>{t.exit}</button>
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
            t={t}
          />
        )}
        {view === 'add' && (
          <TransactionForm
            categories={categories}
            onAdd={(tx) => { addTransaction(tx); setView('transactions'); }}
            t={t}
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
            t={t}
          />
        )}
        {view === 'fixed' && (
          <FixedExpenses
            userId={currentUser}
            categories={categories}
            onTransactionChange={() => setTxVersion(v => v + 1)}
            t={t}
          />
        )}
        {view === 'categories' && (
  <CategoriesEditor key={language} categories={categories} onSave={saveCategories} t={t} />
)}
        {view === 'admin' && isAdmin && (
          <AdminPanel t={t} />
        )}
      </main>
    </div>
  );
}

function CategoriesEditor({ categories, onSave, t }) {
  const [incomeList, setIncomeList] = useState(categories.income);
  const [expenseList, setExpenseList] = useState(categories.expense);
  const [newIncome, setNewIncome] = useState('');
  const [newExpense, setNewExpense] = useState('');
  const [saved, setSaved] = useState(false);
  const [editingTag, setEditingTag] = useState(null);
  const [editingValue, setEditingValue] = useState('');

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

  const startEditTag = (type, name) => {
    setEditingTag({ type, name });
    setEditingValue(name);
  };

  const saveEditTag = () => {
    const trimmed = editingValue.trim();
    if (!trimmed) return;
    if (editingTag.type === 'income') {
      setIncomeList(prev => prev.map(c => c === editingTag.name ? trimmed : c));
    } else {
      setExpenseList(prev => prev.map(c => c === editingTag.name ? trimmed : c));
    }
    setEditingTag(null);
    setEditingValue('');
  };

  const deleteTag = (type, name) => {
    if (type === 'income') setIncomeList(prev => prev.filter(c => c !== name));
    else setExpenseList(prev => prev.filter(c => c !== name));
  };

  const handleSave = () => {
    onSave({ income: incomeList, expense: expenseList });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const tagStyle = (color) => ({
    display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
    padding: '0.3rem 0.75rem', borderRadius: '20px',
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
      <h2 style={{ marginBottom: '0.5rem', color: '#1e293b' }}>{t.editCategories}</h2>
      <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '1.5rem' }}>{t.editCategoriesHint}</p>
      <div style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
        <label style={{ display: 'block', fontWeight: 600, color: '#22c55e', marginBottom: '0.5rem' }}>{t.incomeCategories}</label>
        <div>
          {incomeList.map(c => (
            editingTag?.type === 'income' && editingTag?.name === c ? (
              <span key={c} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', margin: '0.25rem' }}>
                <input autoFocus value={editingValue} onChange={e => setEditingValue(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') saveEditTag(); if (e.key === 'Escape') setEditingTag(null); }} style={{ padding: '0.3rem 0.5rem', border: '2px solid #22c55e', borderRadius: '8px', fontSize: '0.85rem', width: '120px' }} />
                <button onClick={saveEditTag} style={{ background: '#22c55e', color: 'white', border: 'none', borderRadius: '6px', padding: '0.3rem 0.5rem', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>{t.ok}</button>
                <button onClick={() => setEditingTag(null)} style={{ background: '#f1f5f9', color: '#64748b', border: 'none', borderRadius: '6px', padding: '0.3rem 0.5rem', cursor: 'pointer', fontSize: '0.8rem' }}>✕</button>
              </span>
            ) : (
              <span key={c} style={tagStyle('green')}>
                <span onClick={() => startEditTag('income', c)} style={{ cursor: 'pointer' }}>✏️ {c}</span>
                <span onClick={() => deleteTag('income', c)} style={{ cursor: 'pointer', marginLeft: '0.25rem', opacity: 0.6, fontWeight: 700 }}>×</span>
              </span>
            )
          ))}
        </div>
        <div style={inputRow}>
          <input value={newIncome} onChange={e => setNewIncome(e.target.value)} onKeyDown={e => e.key === 'Enter' && addIncome()} placeholder={t.newIncomeCategory} style={inputStyle} />
          <button onClick={addIncome} style={addBtnStyle('green')}>+ {t.add}</button>
        </div>

        <hr style={{ border: 'none', borderTop: '1px solid #f1f5f9', margin: '0.5rem 0 1rem' }} />

        <label style={{ display: 'block', fontWeight: 600, color: '#ef4444', marginBottom: '0.5rem' }}>{t.expenseCategories}</label>
        <div>
          {expenseList.map(c => (
            editingTag?.type === 'expense' && editingTag?.name === c ? (
              <span key={c} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', margin: '0.25rem' }}>
                <input autoFocus value={editingValue} onChange={e => setEditingValue(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') saveEditTag(); if (e.key === 'Escape') setEditingTag(null); }} style={{ padding: '0.3rem 0.5rem', border: '2px solid #ef4444', borderRadius: '8px', fontSize: '0.85rem', width: '120px' }} />
                <button onClick={saveEditTag} style={{ background: '#ef4444', color: 'white', border: 'none', borderRadius: '6px', padding: '0.3rem 0.5rem', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>{t.ok}</button>
                <button onClick={() => setEditingTag(null)} style={{ background: '#f1f5f9', color: '#64748b', border: 'none', borderRadius: '6px', padding: '0.3rem 0.5rem', cursor: 'pointer', fontSize: '0.8rem' }}>✕</button>
              </span>
            ) : (
              <span key={c} style={tagStyle('red')}>
                <span onClick={() => startEditTag('expense', c)} style={{ cursor: 'pointer' }}>✏️ {c}</span>
                <span onClick={() => deleteTag('expense', c)} style={{ cursor: 'pointer', marginLeft: '0.25rem', opacity: 0.6, fontWeight: 700 }}>×</span>
              </span>
            )
          ))}
        </div>
        <div style={inputRow}>
          <input value={newExpense} onChange={e => setNewExpense(e.target.value)} onKeyDown={e => e.key === 'Enter' && addExpense()} placeholder={t.newExpenseCategory} style={inputStyle} />
          <button onClick={addExpense} style={addBtnStyle('red')}>+ {t.add}</button>
        </div>

        <button onClick={handleSave} style={{ width: '100%', padding: '0.75rem', background: '#6366f1', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, marginTop: '0.5rem' }}>
          {saved ? t.saved : t.saveCategories}
        </button>
      </div>
    </div>
  );
}
