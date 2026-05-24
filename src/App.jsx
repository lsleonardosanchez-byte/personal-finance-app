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
        <span style={{ fontWeight: 700, fontSize: '1.2rem' }}>💰 My Finances</span>
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
            }}>👑 Admin</button>
