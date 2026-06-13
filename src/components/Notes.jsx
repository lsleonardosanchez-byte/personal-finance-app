import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc, query, where, orderBy } from 'firebase/firestore';

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export default function Notes({ userId }) {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newDate, setNewDate] = useState(today());
  const [newText, setNewText] = useState('');
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editDate, setEditDate] = useState('');
  const [editText, setEditText] = useState('');

  useEffect(() => { fetchNotes(); }, [userId]);

  const fetchNotes = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'notes'), where('userId', '==', userId), orderBy('date', 'desc'));
      const snap = await getDocs(q);
      setNotes(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) {
      const q = query(collection(db, 'notes'), where('userId', '==', userId));
      const snap = await getDocs(q);
      const sorted = snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => new Date(b.date) - new Date(a.date));
      setNotes(sorted);
    }
    setLoading(false);
  };

  const addNote = async () => {
    if (!newText.trim()) return setError('Please write a note.');
    if (!newDate) return setError('Please select a date.');
    setError('');
    const data = { userId, date: newDate, text: newText.trim(), createdAt: Date.now() };
    const ref = await addDoc(collection(db, 'notes'), data);
    const newNote = { id: ref.id, ...data };
    setNotes(prev => [newNote, ...prev].sort((a, b) => new Date(b.date) - new Date(a.date)));
    setNewText('');
    setNewDate(today());
  };

  const deleteNote = async (id) => {
    await deleteDoc(doc(db, 'notes', id));
    setNotes(prev => prev.filter(n => n.id !== id));
  };

  const startEdit = (note) => {
    setEditingId(note.id);
    setEditDate(note.date);
    setEditText(note.text);
  };

  const saveEdit = async (id) => {
    if (!editText.trim()) return;
    await updateDoc(doc(db, 'notes', id), { date: editDate, text: editText.trim() });
    setNotes(prev => prev.map(n => n.id === id ? { ...n, date: editDate, text: editText.trim() } : n).sort((a, b) => new Date(b.date) - new Date(a.date)));
    setEditingId(null);
  };

  const inputStyle = { padding: '0.6rem 0.75rem', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.9rem', width: '100%' };

  return (
    <div style={{ maxWidth: '650px', margin: '0 auto' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ color: '#1e293b', marginBottom: '0.25rem' }}>📝 Notes</h2>
        <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Keep track of your financial decisions and reminders.</p>
      </div>

      {/* Add note form */}
      <div style={{ background: 'white', borderRadius: '12px', padding: '1.25rem', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
          <input
            type="date"
            value={newDate}
            onChange={e => setNewDate(e.target.value)}
            style={{ ...inputStyle, width: '160px', flex: 'none' }}
          />
        </div>
        <textarea
          value={newText}
          onChange={e => setNewText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && e.ctrlKey && addNote()}
          placeholder="Write your note here... (Ctrl+Enter to save)"
          rows={3}
          style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit', marginBottom: '0.75rem' }}
        />
        {error && <p style={{ color: '#ef4444', fontSize: '0.85rem', marginBottom: '0.75rem' }}>{error}</p>}
        <button onClick={addNote} style={{ width: '100%', padding: '0.75rem', background: '#6366f1', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', fontSize: '0.95rem' }}>
          + Add Note
        </button>
      </div>

      {/* Notes list */}
      {loading ? (
        <p style={{ color: '#94a3b8', textAlign: 'center', padding: '2rem' }}>Loading...</p>
      ) : notes.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', background: 'white', borderRadius: '12px', color: '#94a3b8' }}>
          <p style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📝</p>
          <p>No notes yet. Add your first one above!</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {notes.map(note => (
            <div key={note.id} style={{
              background: 'white', borderRadius: '10px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
              borderLeft: '4px solid #6366f1',
              overflow: 'hidden'
            }}>
              {editingId === note.id ? (
                <div style={{ padding: '1rem 1.25rem', background: '#fafafe' }}>
                  <input
                    type="date"
                    value={editDate}
                    onChange={e => setEditDate(e.target.value)}
                    style={{ ...inputStyle, marginBottom: '0.75rem' }}
                  />
                  <textarea
                    value={editText}
                    onChange={e => setEditText(e.target.value)}
                    rows={3}
                    style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit', marginBottom: '0.75rem' }}
                  />
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button onClick={() => saveEdit(note.id)} style={{ flex: 1, padding: '0.6rem', background: '#6366f1', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>Save</button>
                    <button onClick={() => setEditingId(null)} style={{ padding: '0.6rem 1rem', background: '#f1f5f9', color: '#64748b', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                  </div>
                </div>
              ) : (
                <div style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem' }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: '0.78rem', color: '#94a3b8', marginBottom: '0.4rem', fontWeight: 500 }}>{note.date}</p>
                    <p style={{ color: '#1e293b', fontSize: '0.95rem', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{note.text}</p>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                    <button onClick={() => startEdit(note)} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '0.3rem 0.6rem', fontSize: '0.8rem', cursor: 'pointer', color: '#6366f1', fontWeight: 500 }}>Edit</button>
                    <button onClick={() => deleteNote(note.id)} style={{ background: 'none', border: 'none', color: '#cbd5e1', fontSize: '1.1rem', cursor: 'pointer' }}>🗑️</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
