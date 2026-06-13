import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

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
  const [rows, setRows] = useState(DEFAULT_ROWS);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);

  useEffect(() => { fetchData(); }, [userId]);

  const fetchData = async () => {
    setLoading(true);
    const snap = await getDoc(doc(db, 'salarySimulator', userId));
    if (snap.exists() && snap.data().rows) {
      setRows(snap.data().rows);
    }
    setLoading(false);
  };

  const saveData = async (newRows) => {
    await setDoc(doc(db, 'salarySimulator', userId), { rows: newRows });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const updateRow = (id, field, value) => {
    setRows(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  const addRow = () => {
    const newRow = { id: Date.now(), concepto: '', cant: '', devengado: 0, deducido: 0 };
    setRows(prev => [...prev, newRow]);
  };

  const deleteRow = (id) => {
    setRows(prev => prev.filter(r => r.id !== id));
  };

  const totalDevengado = rows.reduce((s, r) => s + (Number(r.devengado) || 0), 0);
  const totalDeducido = rows.reduce((s, r) => s + (Number(r.deducido) || 0), 0);
  const saldo = totalDevengado - totalDeducido;

  const cellStyle = {
    padding: '0.5rem 0.75rem',
    border: '1px solid #e2e8f0',
    fontSize: '0.88rem',
    color: '#1e293b',
    background: 'white',
  };

  const inputStyle = {
    width: '100%',
    border: 'none',
    outline: 'none',
    fontSize: '0.88rem',
    color: '#1e293b',
    background: 'transparent',
    padding: 0,
  };

  const numberInputStyle = {
    ...inputStyle,
    textAlign: 'right',
  };

  if (loading) return <p style={{ color: '#94a3b8', textAlign: 'center', padding: '3rem' }}>Loading...</p>;

  return (
    <div style={{ maxWidth: '750px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h2 style={{ color: '#1e293b', marginBottom: '0.25rem' }}>💼 Salary Simulator</h2>
          <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Edit your salary breakdown. Changes save automatically.</p>
        </div>
        <button
          onClick={() => saveData(rows)}
          style={{ padding: '0.6rem 1.25rem', background: '#6366f1', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', fontSize: '0.9rem' }}
        >
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
                  <input
                    value={row.concepto}
                    onChange={e => updateRow(row.id, 'concepto', e.target.value)}
                    style={inputStyle}
                    placeholder="Concepto..."
                  />
                </td>
                <td style={{ ...cellStyle, textAlign: 'right' }}>
                  <input
                    value={row.cant}
                    onChange={e => updateRow(row.id, 'cant', e.target.value)}
                    style={numberInputStyle}
                    placeholder="0"
                  />
                </td>
                <td style={{ ...cellStyle, textAlign: 'right' }}>
                  <input
                    type="number"
                    value={row.devengado || ''}
                    onChange={e => updateRow(row.id, 'devengado', e.target.value)}
                    style={numberInputStyle}
                    placeholder="0"
                  />
                </td>
                <td style={{ ...cellStyle, textAlign: 'right' }}>
                  <input
                    type="number"
                    value={row.deducido || ''}
                    onChange={e => updateRow(row.id, 'deducido', e.target.value)}
                    style={numberInputStyle}
                    placeholder="0"
                  />
                </td>
                <td style={{ ...cellStyle, textAlign: 'center', padding: '0.25rem' }}>
                  <button
                    onClick={() => deleteRow(row.id)}
                    style={{ background: 'none', border: 'none', color: '#cbd5e1', cursor: 'pointer', fontSize: '1rem', padding: '0.25rem' }}
                  >🗑️</button>
                </td>
              </tr>
            ))}

            {/* Totales row */}
            <tr style={{ background: '#22c55e' }}>
              <td colSpan={2} style={{ ...cellStyle, background: '#22c55e', color: 'white', fontWeight: 700, fontSize: '0.9rem', border: '1px solid rgba(255,255,255,0.2)' }}>Totales</td>
              <td style={{ ...cellStyle, background: '#22c55e', color: 'white', fontWeight: 700, textAlign: 'right', border: '1px solid rgba(255,255,255,0.2)' }}>{fmt(totalDevengado)}</td>
              <td style={{ ...cellStyle, background: '#22c55e', color: 'white', fontWeight: 700, textAlign: 'right', border: '1px solid rgba(255,255,255,0.2)' }}>{fmt(totalDeducido)}</td>
              <td style={{ ...cellStyle, background: '#22c55e', border: 'none' }}></td>
            </tr>

            {/* Saldo row */}
            <tr style={{ background: '#f0fdf4' }}>
              <td colSpan={2} style={{ ...cellStyle, background: '#f0fdf4', fontWeight: 700, fontSize: '0.9rem', color: '#15803d' }}>Saldo (Abonado en cuenta)</td>
              <td colSpan={2} style={{ ...cellStyle, background: '#f0fdf4', fontWeight: 700, fontSize: '1rem', color: '#15803d', textAlign: 'right' }}>{fmt(saldo)}</td>
              <td style={{ ...cellStyle, background: '#f0fdf4', border: 'none' }}></td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Add row button */}
      <button
        onClick={addRow}
        style={{ width: '100%', padding: '0.75rem', background: 'white', color: '#6366f1', border: '2px dashed #c7d2fe', borderRadius: '10px', fontWeight: 600, cursor: 'pointer', fontSize: '0.9rem' }}
      >
        + Add Row
      </button>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginTop: '1rem' }}>
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
    </div>
  );
}
