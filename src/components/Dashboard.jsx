import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, Cell
} from 'recharts';

const COLORS = ['#6366f1','#22c55e','#f59e0b','#ef4444','#06b6d4','#8b5cf6','#ec4899','#14b8a6'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

const fmt = (n) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);

export default function Dashboard({ transactions, currentMonth, currentYear, onMonthChange }) {
  const income = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const expenses = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const balance = income - expenses;

  // Expenses by category - bar chart data
  const expenseByCategory = transactions
    .filter(t => t.type === 'expense')
    .reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + t.amount;
      return acc;
    }, {});
  const categoryData = Object.entries(expenseByCategory)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  // Weekly data
  const weeklyData = [1, 2, 3, 4].map(week => {
    const weekT = transactions.filter(t => {
      const day = parseInt(t.date.split('-')[2]);
      return Math.ceil(day / 7) === week;
    });
    return {
      name: `Week ${week}`,
      Income: weekT.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0),
      Expenses: weekT.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0),
    };
  });

  // Daily data
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const dailyData = Array.from({ length: daysInMonth }, (_, i) => {
    const day = String(i + 1).padStart(2, '0');
    const month = String(currentMonth + 1).padStart(2, '0');
    const dateStr = `${currentYear}-${month}-${day}`;
    const dayT = transactions.filter(t => t.date === dateStr);
    const date = new Date(currentYear, currentMonth, i + 1);
    return {
      name: `${i + 1}`,
      day: DAYS[date.getDay()],
      Income: dayT.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0),
      Expenses: dayT.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0),
    };
  }).filter(d => d.Income > 0 || d.Expenses > 0);

  const prevMonth = () => {
    if (currentMonth === 0) onMonthChange(11, currentYear - 1);
    else onMonthChange(currentMonth - 1, currentYear);
  };

  const nextMonth = () => {
    if (currentMonth === 11) onMonthChange(0, currentYear + 1);
    else onMonthChange(currentMonth + 1, currentYear);
  };

  const chartStyle = { background: 'white', borderRadius: '12px', padding: '1.25rem', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', marginBottom: '1rem' };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <button onClick={prevMonth} style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.4rem 0.8rem', color: '#64748b' }}>&#9664;</button>
        <h2 style={{ fontWeight: 700, color: '#1e293b' }}>{MONTHS[currentMonth]} {currentYear}</h2>
        <button onClick={nextMonth} style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.4rem 0.8rem', color: '#64748b' }}>&#9654;</button>
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

      {/* Expenses by category - bar chart */}
      <div style={chartStyle}>
        <h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: '#1e293b', marginBottom: '1rem' }}>Expenses by Category</h3>
        {categoryData.length === 0 ? (
          <p style={{ color: '#94a3b8', fontSize: '0.85rem', textAlign: 'center', padding: '2rem 0' }}>No expenses this month</p>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={categoryData} layout="vertical" margin={{ left: 10, right: 20 }}>
              <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={80} />
              <Tooltip formatter={v => fmt(v)} />
              <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                {categoryData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Weekly overview */}
      <div style={chartStyle}>
        <h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: '#1e293b', marginBottom: '1rem' }}>Weekly Overview</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={weeklyData}>
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
            <Tooltip formatter={v => fmt(v)} />
            <Legend formatter={value => <span style={{ fontSize: '0.75rem' }}>{value}</span>} />
            <Bar dataKey="Income" fill="#22c55e" radius={[4,4,0,0]} />
            <Bar dataKey="Expenses" fill="#ef4444" radius={[4,4,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Daily overview */}
      <div style={chartStyle}>
        <h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: '#1e293b', marginBottom: '1rem' }}>Daily Overview</h3>
        {dailyData.length === 0 ? (
          <p style={{ color: '#94a3b8', fontSize: '0.85rem', textAlign: 'center', padding: '2rem 0' }}>No transactions this month</p>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={dailyData}>
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
              <Tooltip formatter={v => fmt(v)} labelFormatter={label => {
                const d = dailyData.find(x => x.name === label);
                return d ? `Day ${label} (${d.day})` : `Day ${label}`;
              }} />
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
