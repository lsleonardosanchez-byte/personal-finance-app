import React, { useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, Cell
} from 'recharts';

const COLORS = ['#6366f1','#22c55e','#f59e0b','#ef4444','#06b6d4','#8b5cf6','#ec4899','#14b8a6'];
const fmt = (n) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);

export default function Dashboard({ transactions, currentMonth, currentYear, onMonthChange, selectedMonths, selectedYear, onMonthsChange, onYearChange, t }) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [expandedCategories, setExpandedCategories] = useState({});

  const months = selectedMonths && selectedMonths.length > 0 ? selectedMonths : [currentMonth];
  const year = selectedYear || currentYear;

  const filtered = transactions.filter(tr => {
    const [y, m] = tr.date.split('-').map(Number);
    return y === year && months.includes(m - 1);
  });

  const categoryFiltered = selectedCategory ? filtered.filter(tr => tr.category === selectedCategory) : filtered;

  const income = filtered.filter(tr => tr.type === 'income').reduce((s, tr) => s + tr.amount, 0);
  const expenses = filtered.filter(tr => tr.type === 'expense').reduce((s, tr) => s + tr.amount, 0);
  const balance = income - expenses;

  const allCategories = [...new Set(filtered.filter(tr => tr.type === 'expense').map(tr => tr.category))];
  const categoryData = allCategories.map(cat => {
    const entry = { name: cat };
    months.forEach(m => {
      const monthT = filtered.filter(tr => {
        const [, tm] = tr.date.split('-').map(Number);
        return tm - 1 === m && tr.type === 'expense' && tr.category === cat;
      });
      entry[t.monthsShort[m]] = monthT.reduce((s, tr) => s + tr.amount, 0);
    });
    return entry;
  }).sort((a, b) => {
    const aTotal = months.reduce((s, m) => s + (a[t.monthsShort[m]] || 0), 0);
    const bTotal = months.reduce((s, m) => s + (b[t.monthsShort[m]] || 0), 0);
    return bTotal - aTotal;
  });

  const weeklyData = [1,2,3,4].map(week => {
    const entry = { name: `${t.weeklyOverview.split(' ')[0]} ${week}` };
    months.forEach(m => {
      const weekT = categoryFiltered.filter(tr => {
        const [y, tm, td] = tr.date.split('-').map(Number);
        return y === year && tm - 1 === m && Math.ceil(Number(td) / 7) === week;
      });
      if (months.length === 1) {
        entry[t.income] = (entry[t.income] || 0) + weekT.filter(tr => tr.type === 'income').reduce((s, tr) => s + tr.amount, 0);
        entry[t.expenses] = (entry[t.expenses] || 0) + weekT.filter(tr => tr.type === 'expense').reduce((s, tr) => s + tr.amount, 0);
      } else {
        entry[`${t.income} ${t.monthsShort[m]}`] = weekT.filter(tr => tr.type === 'income').reduce((s, tr) => s + tr.amount, 0);
        entry[`${t.expenses} ${t.monthsShort[m]}`] = weekT.filter(tr => tr.type === 'expense').reduce((s, tr) => s + tr.amount, 0);
      }
    });
    return entry;
  });

  const dailyMap = {};
  categoryFiltered.forEach(tr => {
    const [y, m, d] = tr.date.split('-').map(Number);
    if (y !== year || !months.includes(m - 1)) return;
    const key = `${d}/${m}`;
    if (!dailyMap[key]) dailyMap[key] = { name: key, _d: d, _m: m };
    dailyMap[key][t.income] = (dailyMap[key][t.income] || 0) + (tr.type === 'income' ? tr.amount : 0);
    dailyMap[key][t.expenses] = (dailyMap[key][t.expenses] || 0) + (tr.type === 'expense' ? tr.amount : 0);
  });
  const dailyData = Object.values(dailyMap).sort((a, b) => a._m !== b._m ? a._m - b._m : a._d - b._d);

  const expenseTransactions = filtered.filter(tr => tr.type === 'expense');
  const categoryGroups = expenseTransactions.reduce((acc, tr) => {
    if (!acc[tr.category]) acc[tr.category] = { total: 0, transactions: [] };
    acc[tr.category].total += tr.amount;
    acc[tr.category].transactions.push(tr);
    return acc;
  }, {});
  const sortedGroups = Object.entries(categoryGroups)
    .sort((a, b) => b[1].total - a[1].total)
    .map(([cat, data]) => ({ category: cat, total: data.total, transactions: data.transactions.sort((a, b) => new Date(b.date) - new Date(a.date)) }));
  const grandTotal = sortedGroups.reduce((s, g) => s + g.total, 0);

  const toggleCategory = (cat) => setExpandedCategories(prev => ({ ...prev, [cat]: !prev[cat] }));
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
    ? [{ key: t.income, color: '#22c55e' }, { key: t.expenses, color: '#ef4444' }]
    : months.flatMap(m => [
        { key: `${t.income} ${t.monthsShort[m]}`, color: '#22c55e' },
        { key: `${t.expenses} ${t.monthsShort[m]}`, color: '#ef4444' }
      ]);

  return (
    <div>
      {/* Filter */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <select value={year} onChange={e => onYearChange(Number(e.target.value))} style={{ padding: '0.5rem 0.75rem', border: '1px solid #e2e8f0', borderRadius: '8px', fontWeight: 600, color: '#1e293b', background: 'white' }}>
          {[2023,2024,2025,2026,2027].map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <div style={{ position: 'relative' }}>
          <button onClick={() => setDropdownOpen(o => !o)} style={{ padding: '0.5rem 1rem', border: '1px solid #e2e8f0', borderRadius: '8px', background: 'white', fontWeight: 500, color: '#1e293b', cursor: 'pointer' }}>
            {months.length === 1 ? t.months[months[0]] : `${months.length} ${t.monthsSelected}`} ▾
          </button>
          {dropdownOpen && (
            <div style={{ position: 'absolute', top: '110%', left: 0, background: 'white', border: '1px solid #e2e8f0', borderRadius: '10px', boxShadow: '0 4px 16px rgba(0,0,0,0.1)', zIndex: 100, minWidth: '180px', padding: '0.5rem' }}>
              {t.months.map((name, i) => (
                <div key={i} onClick={() => toggleMonth(i)} style={{ padding: '0.5rem 0.75rem', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', background: months.includes(i) ? '#eef2ff' : 'transparent', color: months.includes(i) ? '#6366f1' : '#1e293b', fontWeight: months.includes(i) ? 600 : 400 }}>
                  <span style={{ width: '16px', height: '16px', borderRadius: '4px', border: `2px solid ${months.includes(i) ? '#6366f1' : '#cbd5e1'}`, background: months.includes(i) ? '#6366f1' : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {months.includes(i) && <span style={{ color: 'white', fontSize: '10px', fontWeight: 700 }}>✓</span>}
                  </span>
                  {name}
                </div>
              ))}
              <div onClick={() => setDropdownOpen(false)} style={{ padding: '0.5rem 0.75rem', borderRadius: '6px', cursor: 'pointer', color: '#6366f1', fontWeight: 600, textAlign: 'center', borderTop: '1px solid #f1f5f9', marginTop: '0.25rem' }}>{t.done}</div>
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
          { label: t.income, value: income, color: '#22c55e', bg: '#f0fdf4' },
          { label: t.expenses, value: expenses, color: '#ef4444', bg: '#fef2f2' },
          { label: t.balance, value: balance, color: balance >= 0 ? '#6366f1' : '#ef4444', bg: '#eef2ff' }
        ].map(card => (
          <div key={card.label} style={{ background: card.bg, borderRadius: '12px', padding: '1.25rem', textAlign: 'center' }}>
            <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '0.5rem', fontWeight: 500 }}>{card.label}</p>
            <p style={{ fontSize: '1rem', fontWeight: 700, color: card.color }}>{fmt(card.value)}</p>
          </div>
        ))}
      </div>

      {/* Expenses by category */}
      <div style={chartStyle}>
        <h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: '#1e293b', marginBottom: '0.25rem' }}>{t.expensesByCategory}</h3>
        <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '1rem' }}>{t.clickBarToFilter}</p>
        {categoryData.length === 0 ? (
          <p style={{ color: '#94a3b8', fontSize: '0.85rem', textAlign: 'center', padding: '2rem 0' }}>{t.noExpenses}</p>
        ) : (
          <ResponsiveContainer width="100%" height={Math.max(200, categoryData.length * 45)}>
            <BarChart data={categoryData} layout="vertical" margin={{ left: 10, right: 20 }} onClick={handleCategoryClick} style={{ cursor: 'pointer' }}>
              <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={90} />
              <Tooltip formatter={v => fmt(v)} />
              {months.length === 1 ? (
                <Bar dataKey={t.monthsShort[months[0]]} radius={[0,6,6,0]}>
                  {categoryData.map((entry, i) => (
                    <Cell key={i} fill={selectedCategory === entry.name ? '#f59e0b' : COLORS[i % COLORS.length]} opacity={selectedCategory && selectedCategory !== entry.name ? 0.4 : 1} />
                  ))}
                </Bar>
              ) : (
                months.map((m, i) => (
                  <Bar key={m} dataKey={t.monthsShort[m]} fill={COLORS[i % COLORS.length]} radius={[0,4,4,0]} />
                ))
              )}
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Weekly overview */}
      <div style={chartStyle}>
        <h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: '#1e293b', marginBottom: '1rem' }}>
          {t.weeklyOverview} {selectedCategory ? `— ${selectedCategory}` : ''}
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
          {t.dailyOverview} {selectedCategory ? `— ${selectedCategory}` : ''}
        </h3>
        {dailyData.length === 0 ? (
          <p style={{ color: '#94a3b8', fontSize: '0.85rem', textAlign: 'center', padding: '2rem 0' }}>{t.noTransactions}</p>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={dailyData}>
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
              <Tooltip formatter={v => fmt(v)} />
              <Legend formatter={value => <span style={{ fontSize: '0.75rem' }}>{value}</span>} />
              <Bar dataKey={t.income} fill="#22c55e" radius={[4,4,0,0]} />
              <Bar dataKey={t.expenses} fill="#ef4444" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Expense detail table */}
      {sortedGroups.length > 0 && (
        <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', overflow: 'hidden', marginBottom: '1rem' }}>
          <div style={{ padding: '1.25rem 1.25rem 0.75rem', borderBottom: '1px solid #f1f5f9' }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: '#1e293b' }}>{t.expenseDetailByCategory}</h3>
            <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.2rem' }}>{t.clickCategoryToExpand}</p>
          </div>
          {sortedGroups.map((group, gi) => (
            <div key={group.category} style={{ borderBottom: gi < sortedGroups.length - 1 ? '1px solid #f8fafc' : 'none' }}>
              <div onClick={() => toggleCategory(group.category)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.9rem 1.25rem', cursor: 'pointer', background: expandedCategories[group.category] ? '#fafafe' : 'white' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ fontSize: '0.85rem', color: expandedCategories[group.category] ? '#6366f1' : '#64748b', display: 'inline-block', transform: expandedCategories[group.category] ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>▶</span>
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: COLORS[gi % COLORS.length] }} />
                  <span style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.95rem' }}>{group.category}</span>
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{group.transactions.length} {group.transactions.length !== 1 ? t.transactions : t.transaction}</span>
                </div>
                <span style={{ fontWeight: 700, color: '#ef4444', fontSize: '0.95rem' }}>{fmt(group.total)}</span>
              </div>
              {expandedCategories[group.category] && (
                <div style={{ background: '#fafafe' }}>
                  {group.transactions.map(tr => (
                    <div key={tr.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.6rem 1.25rem 0.6rem 3rem', borderTop: '1px solid #f1f5f9' }}>
                      <div style={{ flex: 1 }}>
                        <span style={{ fontSize: '0.88rem', color: '#1e293b', fontWeight: 500 }}>{tr.note ? tr.note.replace('Fixed: ', '') : tr.category}</span>
                        <span style={{ fontSize: '0.78rem', color: '#94a3b8', marginLeft: '0.5rem' }}>{tr.date}</span>
                      </div>
                      <span style={{ fontWeight: 600, color: '#ef4444', fontSize: '0.88rem' }}>{fmt(tr.amount)}</span>
                    </div>
                  ))}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '0.5rem 1.25rem', borderTop: '1px solid #e2e8f0', background: '#f1f5f9' }}>
                    <span style={{ fontSize: '0.8rem', color: '#64748b', marginRight: '1rem' }}>{t.subtotal}</span>
                    <span style={{ fontWeight: 700, color: '#ef4444', fontSize: '0.88rem' }}>{fmt(group.total)}</span>
                  </div>
                </div>
              )}
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.25rem', background: '#fef2f2', borderTop: '2px solid #fecaca' }}>
            <span style={{ fontWeight: 700, color: '#1e293b', fontSize: '0.95rem' }}>{t.totalExpenses}</span>
            <span style={{ fontWeight: 700, color: '#ef4444', fontSize: '1.1rem' }}>{fmt(grandTotal)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
