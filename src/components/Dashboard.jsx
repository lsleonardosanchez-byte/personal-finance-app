import React, { useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, Cell
} from 'recharts';

const COLORS = ['#6366f1','#22c55e','#f59e0b','#ef4444','#06b6d4','#8b5cf6','#ec4899','#14b8a6'];
const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const fmt = (n) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);

export default function Dashboard({ transactions, currentMonth, currentYear, onMonthChange, selectedMonths, selectedYear, onMonthsChange, onYearChange }) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);

  const months = selectedMonths && selectedMonths.length > 0 ? selectedMonths : [currentMonth];
  const year = selectedYear || currentYear;

  const filtered = transactions.filter(t => {
    const [y, m] = t.date.split('-').map(Number);
    return y === year && months.includes(m - 1);
  });

  const categoryFiltered = selectedCategory
    ? filtered.filter(t => t.category === selectedCategory)
    : filtered;

  const income = filtered.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const expenses = filtered.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const balance = income - expenses;

  // Category bar data
  const allCategories = [...new Set(filtered.filter(t => t.type === 'expense').map(t => t.category))];

  const categoryData = allCategories.map(cat => {
    const entry = { name: cat };
    months.forEach(m => {
      const monthT = filtered.filter(t => {
        const [, tm] = t.date.split('-').map(Number);
        return tm - 1 === m && t.type === 'expense' && t.category === cat;
      });
      entry[MONTH_SHORT[m]] = monthT.reduce((s, t) => s + t.amount, 0);
    });
    return entry;
  }).sort((a, b) => {
    const aTotal = months.reduce((s, m) => s + (a[MONTH_SHORT[m]] || 0), 0);
    const bTotal = months.reduce((s, m) => s + (b[MONTH_SHORT[m]] || 0), 0);
    return bTotal - aTotal;
  });

  // Weekly data (filtered by selected category)
  const weeklyData = [1,2,3,4].map(week => {
    const entry = { name: `Week ${week}` };
    months.forEach(m => {
      const weekT = categoryFiltered.filter(t => {
        const [y, tm, td] = t.date.split('-').map(Number);
        return y === year && tm - 1 === m && Math.ceil(Number(td) / 7) === week;
      });
      if (months.length === 1) {
        entry['Income'] = (entry['Income'] || 0) + weekT.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
        entry['Expenses'] = (entry['Expenses'] || 0) + weekT.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
      } else {
        entry[`Inc ${MONTH_SHORT[m]}`] = weekT.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
        entry[`Exp ${MONTH_SHORT[m]}`] = weekT.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
      }
    });
    return entry;
  });

  // Daily data (filtered by selected category)
  const dailyMap = {};
  categoryFiltered.forEach(t => {
    const [y, m, d] = t.date.split('-').map(Number);
    if (y !== year || !months.includes(m - 1)) return;
    const key = `${d}/${m}`;
    if (!dailyMap[key]) dailyMap[key] = { name: key, Income: 0, Expenses: 0, _d: d, _m: m };
    if (t.type === 'income') dailyMap[key].Income += t.amount;
    else dailyMap[key].Expenses += t.amount;
  });
  const dailyData = Object.values(dailyMap).sort((a, b) => a._m !== b._m ? a._m - b._m : a._d - b._d);

  const handleCategoryClick = (data) => {
    if (!data) return;
    const cat = data.activePayload?.[0]?.payload?.name;
    if (!cat) return;
    setSelectedCategory(prev => prev === cat ? null : cat);
  };

  const toggleMonth = (m) => {
    if (months.includes(m)) {
      if (months.length === 1) return;
      onMonthsChange(months.filter(x => x !== m));
    } else {
      onMonthsChange([...months, m].sort((a, b) => a - b));
    }
  };

  const chartStyle = { background: 'white', borderRadius: '12px', padding: '1.25rem', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', marginBottom: '1rem' };

  const weeklyKeys = months.length === 1
    ? [{ key: 'Income', color: '#22c55e' }, { key: 'Expenses', color: '#ef4444' }]
    : months.flatMap(m => [
        { key: `Inc ${MONTH_SHORT[m]}`, color: '#22c55e' },
        { key: `Exp ${MONTH_SHORT[m]}`, color: '#ef4444' }
      ]);

  return (
    <div>
      {/* Year + Month filter */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <select value={year} onChange={e => onYearChange(Number(e.target.value))} style={{ padding: '0.5rem 0.75rem', border: '1px solid #e2e8f0', borderRadius: '8px', fontWeight: 600, color: '#1e293b', background: 'white' }}>
          {[2023,2024,2025,2026,2027].map(y => <option key={y} value={y}>{y}</option>)}
        </select>

        <div style={{ position: 'relative' }}>
          <button onClick={() => setDropdownOpen(o => !o)} style={{ padding: '0.5rem 1rem', border: '1px solid #e2e8f0', borderRadius: '8px', background: 'white', fontWeight: 500, color: '#1e293b', cursor: 'pointer' }}>
            {months.length === 1 ? MONTH_NAMES[months[0]] : `${months.length} months selected`} ▾
          </button>
          {dropdownOpen && (
            <div style={{ position: 'absolute', top: '110%', left: 0, background: 'white', border: '1px solid #e2e8f0', borderRadius: '10px', boxShadow: '0 4px 16px rgba(0,0,0,0.1)', zIndex: 100, minWidth: '180px', padding: '0.5rem' }}>
              {MONTH_NAMES.map((name, i) => (
                <div key={i} onClick={() => toggleMonth(i)} style={{ padding: '0.5rem 0.75rem', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', background: months.includes(i) ? '#eef2ff' : 'transparent', color: months.includes(i) ? '#6366f1' : '#1e293b', fontWeight: months.includes(i) ? 600 : 400 }}>
                  <span style={{ width: '16px', height: '16px', borderRadius: '4px', border: `2px solid ${months.includes(i) ? '#6366f1' : '#cbd5e1'}`, background: months.includes(i) ? '#6366f1' : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {months.includes(i) && <span style={{ color: 'white', fontSize: '10px', fontWeight: 700 }}>✓</span>}
                  </span>
                  {name}
                </div>
              ))}
              <div onClick={() => setDropdownOpen(false)} style={{ padding: '0.5rem 0.75rem', borderRadius: '6px', cursor: 'pointer', color: '#6366f1', fontWeight: 600, textAlign: 'center', borderTop: '1px solid #f1f5f9', marginTop: '0.25rem' }}>Done</div>
            </div>
          )}
        </div>

        {selectedCategory && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#eef2ff', padding: '0.4rem 0.75rem', borderRadius: '20px' }}>
            <span style={{ fontSize: '0.85rem', color: '#6366f1', fontWeight: 600 }}>Filter: {selectedCategory}</span>
            <button onClick={() => setSelectedCategory(null)} style={{ background: 'none', border: 'none', color: '#6366f1', fontWeight: 700, cursor: 'pointer', fontSize: '1rem', lineHeight: 1 }}>×</button>
          </div>
        )}
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1rem' }}>
        {[
          { label: 'Income', value: income, color: '#22c55e', bg: '#f0fdf4' },
          { label: 'Expenses', value: expenses, color: '#ef4444', bg: '#fef2f2' },
          { label: 'Balance', value: balance, color: balance >= 0 ? '#6366f1' : '#ef4444', bg: '#eef2ff' }
        ].map(card => (
          <div key={card.label} style={{ background: card.bg, borderRadius: '12px', padding: '1.25rem', textAlign: 'center' }}>
            <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '0.5rem', fontWeight: 500 }}>{card.label}</p>
            <p style={{ fontSize: '1rem', fontWeight: 700, color: card.color }}>{fmt(card.value)}</p>
          </div>
        ))}
      </div>

      {/* Expenses by category */}
      <div style={chartStyle}>
        <h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: '#1e293b', marginBottom: '0.25rem' }}>Expenses by Category</h3>
        <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '1rem' }}>Click a bar to filter all charts</p>
        {categoryData.length === 0 ? (
          <p style={{ color: '#94a3b8', fontSize: '0.85rem', textAlign: 'center', padding: '2rem 0' }}>No expenses for selected period</p>
        ) : (
          <ResponsiveContainer width="100%" height={Math.max(200, categoryData.length * 45)}>
            <BarChart data={categoryData} layout="vertical" margin={{ left: 10, right: 20 }} onClick={handleCategoryClick} style={{ cursor: 'pointer' }}>
              <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={90} />
              <Tooltip formatter={v => fmt(v)} />
              {months.length === 1 ? (
                <Bar dataKey={MONTH_SHORT[months[0]]} radius={[0,6,6,0]}>
                  {categoryData.map((entry, i) => (
                    <Cell key={i} fill={selectedCategory === entry.name ? '#f59e0b' : COLORS[i % COLORS.length]} opacity={selectedCategory && selectedCategory !== entry.name ? 0.4 : 1} />
                  ))}
                </Bar>
              ) : (
                months.map((m, i) => (
                  <Bar key={m} dataKey={MONTH_SHORT[m]} fill={COLORS[i % COLORS.length]} radius={[0,4,4,0]} />
                ))
              )}
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Weekly overview */}
      <div style={chartStyle}>
        <h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: '#1e293b', marginBottom: '1rem' }}>
          Weekly Overview {selectedCategory ? `— ${selectedCategory}` : ''}
        </h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={weeklyData}>
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
            <Tooltip formatter={v => fmt(v)} />
            <Legend formatter={value => <span style={{ fontSize: '0.75rem' }}>{value}</span>} />
            {weeklyKeys.map(({ key, color }) => (
              <Bar key={key} dataKey={key} fill={color} radius={[4,4,0,0]} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Daily overview */}
      <div style={chartStyle}>
        <h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: '#1e293b', marginBottom: '1rem' }}>
          Daily Overview {selectedCategory ? `— ${selectedCategory}` : ''}
        </h3>
        {dailyData.length === 0 ? (
          <p style={{ color: '#94a3b8', fontSize: '0.85rem', textAlign: 'center', padding: '2rem 0' }}>No transactions for selected period</p>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={dailyData}>
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
              <Tooltip formatter={v => fmt(v)} />
              <Legend formatter={value => <span style={{ fontSize: '0.75rem' }}>{value}</span>} />
              <Bar dataKey="Income" fill="#22c55e" radius={[4,4,0,0]} />
              <Bar dataKey="Expenses" fill="#ef4444" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
