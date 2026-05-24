import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';

export default function AdminPanel() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [resetSuccess, setResetSuccess] = useState(null);

  useEffect(() => { fetchUsers(); }, []);

  const fetchUsers = async () => {
    setLoading(true);
    const snapshot = await getDocs(collection(db, 'users'));
    setUsers(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    setLoading(false);
  };

  const resetPin = async (userId) => {
    await updateDoc(doc(db, 'users', userId), { pinReset: true });
    setResetSuccess(userId);
    setTimeout(() => setResetSuccess(null), 3000);
  };

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <span style={{ fontSize: '1.5rem' }}>👑</span>
        <h2 style={{ color: '#1e293b', fontWeight: 700 }}>Admin Panel</h2>
      </div>

      <div style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
        <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#64748b', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Registered Users
        </h3>

        {loading ? (
          <p style={{ color: '#94a3b8', textAlign: 'center', padding: '2rem 0' }}>Loading users...</p>
        ) : users.length === 0 ? (
          <p style={{ color: '#94a3b8', textAlign: 'center', padding: '2rem 0' }}>No users yet</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {users.map(user => (
              <div key={user.id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '1rem 1.25rem', background: '#f8fafc',
                borderRadius: '10px', border: '1px solid #e2e8f0'
              }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontWeight: 600, color: '#1e293b' }}>{user.cedula}</span>
                    {user.isAdmin && (
                      <span style={{ fontSize: '0.7rem', background: '#eef2ff', color: '#6366f1', padding: '0.15rem 0.5rem', borderRadius: '20px', fontWeight: 600 }}>
                        Admin
                      </span>
                    )}
                    {user.pinReset && (
                      <span style={{ fontSize: '0.7rem', background: '#fef2f2', color: '#ef4444', padding: '0.15rem 0.5rem', borderRadius: '20px', fontWeight: 600 }}>
                        PIN reset pending
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.2rem' }}>
                    Cédula: {user.cedula}
                  </p>
                </div>

                {!user.isAdmin && (
                  <button
                    onClick={() => resetPin(user.id)}
                    style={{
                      padding: '0.5rem 1rem', borderRadius: '8px', fontSize: '0.85rem',
                      fontWeight: 600, border: 'none', cursor: 'pointer',
                      background: resetSuccess === user.id ? '#f0fdf4' : '#fef2f2',
                      color: resetSuccess === user.id ? '#22c55e' : '#ef4444'
                    }}
                  >
                    {resetSuccess === user.id ? '✅ PIN Reset!' : '🔑 Reset PIN'}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ marginTop: '1rem', background: '#eef2ff', borderRadius: '10px', padding: '1rem 1.25rem' }}>
        <p style={{ fontSize: '0.85rem', color: '#6366f1', fontWeight: 500 }}>
          💡 When you reset a user's PIN, they will be asked to create a new one the next time they log in.
        </p>
      </div>
    </div>
  );
}
