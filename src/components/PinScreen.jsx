import React, { useState } from 'react';
import { db } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import CryptoJS from 'crypto-js';

const ADMIN_CEDULA = '1088284299';
const hashPin = (pin) => CryptoJS.SHA256(pin).toString();

export default function PinScreen({ onUnlock }) {
  const [screen, setScreen] = useState('cedula');
  const [cedula, setCedula] = useState('');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [step, setStep] = useState('enter');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCedulaSubmit = async () => {
    const trimmed = cedula.trim();
    if (!trimmed) return setError('Enter your cédula / Ingresa tu cédula');
    setLoading(true);
    setError('');
    const snap = await getDoc(doc(db, 'users', trimmed));
    setLoading(false);
    if (!snap.exists()) {
      setStep('enter');
      setPin('');
      setScreen('setup');
    } else if (snap.data().pinReset) {
      setStep('enter');
      setPin('');
      setScreen('setup');
    } else {
      setPin('');
      setScreen('login');
    }
  };

  const addDigit = (n) => { if (pin.length < 4) setPin(prev => prev + n); };
  const delDigit = () => setPin(prev => prev.slice(0, -1));

  const handleLogin = async () => {
    setLoading(true);
    const snap = await getDoc(doc(db, 'users', cedula.trim()));
    const stored = snap.data().pin;
    const match = hashPin(pin) === stored;
    setLoading(false);
    if (match) {
      onUnlock(cedula.trim(), cedula.trim() === ADMIN_CEDULA);
    } else {
      setError('Wrong PIN / PIN incorrecto');
      setPin('');
    }
  };

  const handleSetup = async () => {
    if (step === 'enter') {
      if (pin.length < 4) return setError('Enter 4 digits / Ingresa 4 dígitos');
      setConfirmPin(pin);
      setPin('');
      setStep('confirm');
      setError('');
    } else {
      if (pin !== confirmPin) {
        setError('PINs do not match / Los PINs no coinciden');
        setPin('');
        setStep('enter');
      } else {
        setLoading(true);
        const hashed = hashPin(pin);
        await setDoc(doc(db, 'users', cedula.trim()), {
          cedula: cedula.trim(),
          pin: hashed,
          pinReset: false,
          isAdmin: cedula.trim() === ADMIN_CEDULA
        });
        setLoading(false);
        onUnlock(cedula.trim(), cedula.trim() === ADMIN_CEDULA);
      }
    }
  };

  const Card = ({ children }) => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#f8fafc' }}>
      <div style={{ background: 'white', borderRadius: '20px', padding: '2.5rem 2rem', boxShadow: '0 4px 24px rgba(0,0,0,0.08)', width: '320px', textAlign: 'center' }}>
        <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>💰</div>
        <h1 style={{ fontSize: '1.3rem', fontWeight: 700, color: '#1e293b', marginBottom: '1.5rem' }}>My Finances</h1>
        {children}
      </div>
    </div>
  );

  const Dots = () => (
    <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginBottom: '2rem' }}>
      {[0,1,2,3].map(i => (
        <div key={i} style={{ width: '16px', height: '16px', borderRadius: '50%', background: pin.length > i ? '#6366f1' : '#e2e8f0' }} />
      ))}
    </div>
  );

  const Keypad = ({ onSubmit, submitLabel }) => (
    <>
      <Dots />
      {error && <p style={{ color: '#ef4444', fontSize: '0.85rem', marginBottom: '1rem' }}>{error}</p>}
      {loading && <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '1rem' }}>Verifying...</p>}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '10px' }}>
        {[1,2,3,4,5,6,7,8,9].map(n => (
          <button key={n} onClick={() => addDigit(String(n))} style={{ padding: '1rem', fontSize: '1.2rem', fontWeight: 500, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', color: '#1e293b' }}>{n}</button>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
        <button onClick={delDigit} style={{ padding: '1rem', fontSize: '1rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', color: '#64748b' }}>⌫</button>
        <button onClick={() => addDigit('0')} style={{ padding: '1rem', fontSize: '1.2rem', fontWeight: 500, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', color: '#1e293b' }}>0</button>
        <button onClick={onSubmit} disabled={pin.length < 4 || loading} style={{ padding: '1rem', fontSize: '1rem', background: pin.length === 4 ? '#6366f1' : '#e2e8f0', border: 'none', borderRadius: '10px', color: 'white', fontWeight: 600 }}>{submitLabel}</button>
      </div>
    </>
  );

  if (screen === 'cedula') return (
    <Card>
      <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '1rem' }}>Enter your cédula / Ingresa tu cédula</p>
      <input
        value={cedula}
        onChange={e => setCedula(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && handleCedulaSubmit()}
        placeholder="e.g. 123456789"
        type="text"
        inputMode="numeric"
        autoFocus
        style={{ width: '100%', padding: '0.7rem', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '1rem', marginBottom: '1rem', textAlign: 'center', letterSpacing: '0.1em' }}
      />
      {error && <p style={{ color: '#ef4444', fontSize: '0.85rem', marginBottom: '1rem' }}>{error}</p>}
      <button onClick={handleCedulaSubmit} disabled={loading} style={{ width: '100%', padding: '0.75rem', background: '#6366f1', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 600 }}>
        {loading ? 'Checking...' : 'Continue / Continuar'}
      </button>
    </Card>
  );

  if (screen === 'login') return (
    <Card>
      <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '0.25rem' }}>Welcome / Bienvenido</p>
      <p style={{ fontWeight: 700, color: '#1e293b', marginBottom: '1.5rem' }}>{cedula}</p>
      <Keypad onSubmit={handleLogin} submitLabel="OK" />
      <button onClick={() => { setScreen('cedula'); setPin(''); setError(''); }} style={{ marginTop: '1rem', background: 'none', border: 'none', color: '#94a3b8', fontSize: '0.85rem' }}>← Back / Volver</button>
    </Card>
  );

  if (screen === 'setup') return (
    <Card>
      <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
        {step === 'enter' ? 'Create your PIN / Crea tu PIN' : 'Confirm your PIN / Confirma tu PIN'}
      </p>
      <Keypad onSubmit={handleSetup} submitLabel={step === 'enter' ? 'Next / Siguiente' : 'OK'} />
    </Card>
  );
}
