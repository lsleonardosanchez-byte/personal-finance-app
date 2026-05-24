import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export default function PinScreen({ onUnlock }) {
  const [pin, setPin] = useState('');
  const [mode, setMode] = useState('loading');
  const [confirmPin, setConfirmPin] = useState('');
  const [step, setStep] = useState('enter');
  const [error, setError] = useState('');

  useEffect(() => {
    checkPin();
  }, []);

  const checkPin = async () => {
    const snap = await getDoc(doc(db, 'settings', 'pin'));
    setMode(snap.exists() ? 'unlock' : 'setup');
  };

  const handleNumber = (n) => {
    if (pin.length < 4) setPin(prev => prev + n);
  };

  const handleDelete = () => setPin(prev => prev.slice(0, -1));

  const handleSubmit = async () => {
    if (mode === 'setup') {
      if (step === 'enter') {
        if (pin.length < 4) return setError('Enter 4 digits');
        setConfirmPin(pin);
        setPin('');
        setStep('confirm');
        setError('');
      } else {
        if (pin !== confirmPin) {
          setError('PINs do not match. Try again.');
          setPin('');
          setConfirmPin('');
          setStep('enter');
        } else {
          await setDoc(doc(db, 'settings', 'pin'), { value: pin });
          onUnlock();
        }
      }
    } else {
      const snap = await getDoc(doc(db, 'settings', 'pin'));
      if (snap.data().value === pin) {
        onUnlock();
      } else {
        setError('Wrong PIN. Try again.');
        setPin('');
      }
    }
  };

  if (mode === 'loading') return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <p style={{ color: '#94a3b8' }}>Loading...</p>
    </div>
  );

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', minHeight: '100vh', background: '#f8fafc'
    }}>
      <div style={{
        background: 'white', borderRadius: '20px', padding: '2.5rem 2rem',
        boxShadow: '0 4px 24px rgba(0,0,0,0.08)', width: '320px', textAlign: 'center'
      }}>
        <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>💰</div>
        <h1 style={{ fontSize: '1.3rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.25rem' }}>
          My Finances
        </h1>
        <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '2rem' }}>
          {mode === 'setup'
            ? step === 'enter' ? 'Create your 4-digit PIN' : 'Confirm your PIN'
            : 'Enter your PIN'}
        </p>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginBottom: '2rem' }}>
          {[0,1,2,3].map(i => (
            <div key={i} style={{
              width: '16px', height: '16px', borderRadius: '50%',
              background: pin.length > i ? '#6366f1' : '#e2e8f0'
            }} />
          ))}
        </div>

        {error && <p style={{ color: '#ef4444', fontSize: '0.85rem', marginBottom: '1rem' }}>{error}</p>}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '10px' }}>
          {[1,2,3,4,5,6,7,8,9].map(n => (
            <button key={n} onClick={() => handleNumber(String(n))} style={{
              padding: '1rem', fontSize: '1.2rem', fontWeight: 500,
              background: '#f8fafc', border: '1px solid #e2e8f0',
              borderRadius: '10px', color: '#1e293b'
            }}>{n}</button>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
          <button onClick={handleDelete} style={{
            padding: '1rem', fontSize: '1rem', background: '#f8fafc',
            border: '1px solid #e2e8f0', borderRadius: '10px', color: '#64748b'
          }}>⌫</button>
          <button onClick={() => handleNumber('0')} style={{
            padding: '1rem', fontSize: '1.2rem', fontWeight: 500,
            background: '#f8fafc', border: '1px solid #e2e8f0',
            borderRadius: '10px', color: '#1e293b'
          }}>0</button>
          <button onClick={handleSubmit} disabled={pin.length < 4} style={{
            padding: '1rem', fontSize: '1rem',
            background: pin.length === 4 ? '#6366f1' : '#e2e8f0',
            border: 'none', borderRadius: '10px', color: 'white', fontWeight: 600
          }}>OK</button>
        </div>
      </div>
    </div>
  );
}
