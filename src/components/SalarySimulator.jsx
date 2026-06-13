import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs, addDoc, deleteDoc, doc, setDoc, query, where } from 'firebase/firestore';

const fmt = (n) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n || 0);

const DEFAULT_ROWS = [
  { id: 1, concepto: 'Sueldo Básico', cant: 30, devengado: 0, deducido: 0 },
  { id: 2, concepto: 'Intereses Cesantías', cant: '', devengado: 0, deducido: 0 },
  { id: 3, concepto: 'BEA', cant: '', devengado: 0, deducido: 0 },
  { id: 4, concepto: 'Libranza', cant: 1, devengado: 0, deducido: 0 },
  { id: 5, concepto: 'Aporte EPS', cant: 4, devengado: 0, deducido: 0 },
  { id: 6, concepto: 'Aporte Pensión', cant: 4, devengado: 0, deducido: 0 },
  { id: 7, concepto: 'Fondo de Solidaridad', cant: '', devengado: 0, deducido: 0 },
];

export default function SalarySimulator({ userId, t }) {
  const [simulations, setSimulations] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [newName, setNewName] = useState('');
  const [showNewForm, setShowNewForm] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);

  useEffect(() => { fetchSimulations(); }, [userId]);

  const fetchSimulations = async () => {
    setLoading(true);
    const q = query(collection(db, 'salarySimulator'), where('userId', '==', userId));
    const snap = await getDocs(q);
    const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    setSimulations(list);
    if (list.length > 0) {
      setActiveId(list[0].id);
      setRows(list[0].rows || DEFAULT_ROWS);
    } else {
      setRows(DEFAULT_ROWS);
    }
    setLoading(false);
  };

  const createSimulation = async () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    const data = { userId, name: trimmed, rows: DEFAULT_ROWS, createdAt: Date.now() };
    const ref = await addDoc(collection(db, 'salarySimulator'), data);
    const newSim = { id: ref.id, ...data };
    setSimulations(prev => [newSim, ...prev]);
    setActiveId(ref.id);
    setRows(DEFAULT_ROWS);
    setNewName('');
    setShowNewForm(false);
  };

  const deleteSimulation = async (id) => {
    await deleteDoc(doc(db, 'salarySimulator', id));
    const remaining = simulations.filter(s => s.id !== id);
    setSimulations(remaining);
    if (activeId === id) {
      if (remaining.length > 0) {
        setActiveId(remaining[0].id);
        setRows(remaining[0].rows || DEFAULT_ROWS);
      } else {
        setActiveId(null);
        setRows(DEFAULT_ROWS);
      }
    }
    setConfirmDelete(null);
  };

  const saveSimulation = async () => {
    if (!activeId) return;
    await setDoc(doc(db, 'salarySimulator', activeId), { userId, name: simulations.find(s => s.id === activeId)?.name, rows, createdAt: simulations.find(s => s.id === activeId)?.createdAt });
    setSimulations(prev => prev.map(s => s.id === activeId ? { ...s, rows } : s));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const switchSimulation = (sim) => {
    setActiveId(sim.id);
    setRows(sim.rows || DEFAULT_ROWS);
  };

  const updateRow = (id, field, value) => {
    setRows(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  const addRow = () => {
    setRows(prev => [...prev, { id: Date.now(), concepto: '', cant: '', devengado: 0, deducido: 0 }]);
  };

  const deleteRow = (id) => {
    setRows(prev => prev.filter(r => r.id !== id));
  };

  const totalDevengado = rows.reduce((s, r) => s + (Number(r.devengado) || 0), 0);
  const totalDeducido = rows.reduce((s, r) => s + (Number(r.deducido) || 0), 0);
  const saldo = totalDevengado - totalDeducido;

  const activeSim = simulations.find(s => s.id === activeId);

  const cellStyle = { padding: '0.5rem 0.75rem', border: '1px solid #e2e8f0', fontSize: '0.88rem', color: '#1e293b', background: 'white' };
  const inputStyle = { width: '100%', border: 'none', outline: 'none', fontSize: '0.88rem', color: '#1e293b', background: 'transparent', padding: 0 };
  const numberInputStyle = { ...inputStyle, textAlign: 'right' };

  if (loading) return <p style={{ color: '#94a3b8', textAlign: 'center', padding: '3rem' }}>Loading...</p>;

  return (
    <div style={{ maxWidth: '750px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h2 style={{ color: '#1e293b', marginBottom: '0.25rem' }}>💼 Salary Simulator</h2>
          <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Manage and compare your salary simulations.</p>
        </div>
        <button onClick={() => setShowNewForm(o => !o)} style={{ padding: '0.6rem 1.25rem', background: '#6366f1', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', fontSize: '0.9rem' }}>
          + New Simulation
        </button>
      </div>

      {/* New simulation form */}
      {showNewForm && (
        <div style={{ background: '#eef2ff', borderRadius: '10px', padding: '1rem', marginBottom: '1.25rem', display: 'flex', gap: '0.5rem' }}>
          <input
            autoFocus
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && createSimulation()}
            placeholder="e.g. June salary, Bonus month..."
            style={{ flex: 1, padding: '0.6rem 0.75rem', border: '1px solid #c7d2fe', borderRadius: '8px', fontSize: '0.9rem' }}
          />
          <button onClick={createSimulation} style={{ padding: '0.6rem 1rem', background: '#6366f1', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>Create</button>
          <button onClick={() => setShowNewForm(false)} style={{ padding: '0.6rem 1rem', background: '#f1f5f9', color: '#64748b', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
        </div>
      )}

      {/* Simulation tabs */}
      {simulations.length > 0 && (
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
          {simulations.map(sim => (
            <div key={sim.id} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              {confirmDelete === sim.id ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', background: '#fef2f2', padding: '0.3rem 0.75rem', borderRadius: '20px', border: '1px solid #fecaca' }}>
                  <span style={{ fontSize: '0.8rem', color: '#ef4444', fontWeight: 500 }}>Delete?</span>
                  <button onClick={() => deleteSimulation(sim.id)} style={{ background: '#ef4444', color: 'white', border: 'none', borderRadius: '4px', padding: '0.15rem 0.5rem', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}>Yes</button>
                  <button onClick={() => setConfirmDelete(null)} style={{ background: '#f1f5f9', color: '#64748b', border: 'none', borderRadius: '4px', padding: '0.15rem 0.5rem', cursor: 'pointer', fontSize: '0.75rem' }}>No</button>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', background: activeId === sim.id ? '#6366f1' : 'white', border: `1px solid ${activeId === sim.id ? '#6366f1' : '#e2e8f0'}`, borderRadius: '20px', overflow: 'hidden' }}>
                  <button onClick={() => switchSimulation(sim)} style={{ padding: '0.35rem 0.85rem', background: 'transparent', border: 'none', color: activeId === sim.id ? 'white' : '#1e293b', fontWeight: activeId === sim.id ? 600 : 400, cursor: 'pointer', fontSize: '0.85rem' }}>
                    {sim.name}
                  </button>
                  <button onClick={() => setConfirmDelete(sim.id)} style={{ background: 'transparent', border: 'none', color: activeId === sim.id ? 'rgba(255,255,255,0.7)' : '#cbd5e1', cursor: 'pointer', padding: '0.35rem 0.5rem', fontSize: '0.8rem' }}>×</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* No simulations yet */}
      {simulations.length === 0 && (
        <div style={{ textAlign: 'center', padding: '3rem', background: 'white', borderRadius: '12px', color: '#94a3b8', marginBottom: '1.25rem' }}>
          <p style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>💼</p>
          <p>No simulations yet. Click "+ New Simulation" to create your first one!</p>
        </div>
      )}

      {/* Active simulation */}
      {activeId && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <h3 style={{ color: '#1e293b', fontWeight: 600 }}>{activeSim?.name}</h3>
            <button onClick={saveSimulation} style={{ padding: '0.5rem 1.25rem', background: '#6366f1', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', fontSize: '0.9rem' }}>
              {saved ? '✅ Saved!' : '💾 Save'}
            </button>
          </div>

          {/* Table */}
          <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', overflow: 'hidden', marginBottom: '1rem' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#22c55e' }}>
                  {['Concepto', 'Cant.', 'Devengado', 'Deducido', ''].map((h, i) => (
                    <th key={i} style={{ padding: '0.75rem', color: 'white', fontWeight: 700, fontSize: '0.85rem', textAlign: i >= 2 ? 'right' : 'left', borderRight: i < 4 ? '1px solid rgba(255,255,255,0.2)' : 'none', width: i === 1 ? '80px' : i === 4 ? '40px' : 'auto' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => (
                  <tr key={row.id} style={{ background: idx % 2 === 0 ? 'white' : '#f8fafc' }}>
                    <td style={cellStyle}>
                      <input value={row.concepto} onChange={e => updateRow(row.id, 'concepto', e.target.value)} style={inputStyle} placeholder="Concepto..." />
                    </td>
                    <td style={{ ...cellStyle, textAlign: 'right' }}>
                      <input value={row.cant} onChange={e => updateRow(row.id, 'cant', e.target.value)} style={numberInputStyle} placeholder="0" />
                    </td>
                    <td style={{ ...cellStyle, textAlign: 'right' }}>
                      <input type="text" inputMode="numeric" value={row.devengado || ''} onChange={e => updateRow(row.id, 'devengado', e.target.value.replace(/\D/g, ''))} style={numberInputStyle} placeholder="0" />
                    </td>
                    <td style={{ ...cellStyle, textAlign: 'right' }}>
                      <input type="text" inputMode="numeric" value={row.deducido || ''} onChange={e => updateRow(row.id, 'deducido', e.target.value.replace(/\D/g, ''))} style={numberInputStyle} placeholder="0" />
                    </td>
                    <td style={{ ...cellStyle, textAlign: 'center', padding: '0.25rem' }}>
                      <button onClick={() => deleteRow(row.id)} style={{ background: 'none', border: 'none', color: '#cbd5e1', cursor: 'pointer', fontSize: '1rem', padding: '0.25rem' }}>🗑️</button>
                    </td>
                  </tr>
                ))}
                <tr style={{ background: '#22c55e' }}>
                  <td colSpan={2} style={{ ...cellStyle, background: '#22c55e', color: 'white', fontWeight: 700, fontSize: '0.9rem', border: '1px solid rgba(255,255,255,0.2)' }}>Totales</td>
                  <td style={{ ...cellStyle, background: '#22c55e', color: 'white', fontWeight: 700, textAlign: 'right', border: '1px solid rgba(255,255,255,0.2)' }}>{fmt(totalDevengado)}</td>
                  <td style={{ ...cellStyle, background: '#22c55e', color: 'white', fontWeight: 700, textAlign: 'right', border: '1px solid rgba(255,255,255,0.2)' }}>{fmt(totalDeducido)}</td>
                  <td style={{ ...cellStyle, background: '#22c55e', border: 'none' }}></td>
                </tr>
                <tr style={{ background: '#f0fdf4' }}>
                  <td colSpan={2} style={{ ...cellStyle, background: '#f0fdf4', fontWeight: 700, fontSize: '0.9rem', color: '#15803d' }}>Saldo (Abonado en cuenta)</td>
                  <td colSpan={2} style={{ ...cellStyle, background: '#f0fdf4', fontWeight: 700, fontSize: '1rem', color: '#15803d', textAlign: 'right' }}>{fmt(saldo)}</td>
                  <td style={{ ...cellStyle, background: '#f0fdf4', border: 'none' }}></td>
                </tr>
              </tbody>
            </table>
          </div>

          <button onClick={addRow} style={{ width: '100%', padding: '0.75rem', background: 'white', color: '#6366f1', border: '2px dashed #c7d2fe', borderRadius: '10px', fontWeight: 600, cursor: 'pointer', fontSize: '0.9rem', marginBottom: '1rem' }}>
            + Add Row
          </button>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
            {[
              { label: 'Total Devengado', value: totalDevengado, color: '#22c55e', bg: '#f0fdf4' },
              { label: 'Total Deducido', value: totalDeducido, color: '#ef4444', bg: '#fef2f2' },
              { label: 'Saldo Neto', value: saldo, color: saldo >= 0 ? '#6366f1' : '#ef4444', bg: '#eef2ff' },
            ].map(card => (
              <div key={card.label} style={{ background: card.bg, borderRadius: '12px', padding: '1rem', textAlign: 'center' }}>
                <p style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.4rem', fontWeight: 500 }}>{card.label}</p>
                <p style={{ fontSize: '0.95rem', fontWeight: 700, color: card.color }}>{fmt(card.value)}</p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
