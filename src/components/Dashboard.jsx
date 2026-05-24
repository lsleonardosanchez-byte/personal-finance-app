import React from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const COLORS = ['#6366f1','#22c55e','#f59e0b','#ef4444','#06b6d4','#8b5cf6','#ec4899','#14b8a6'];

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const fmt = (n) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);

export default function Dashboard({ transactions, currentMonth, currentYear, onMonthChange }) {
  const income = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const expenses = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const balance = income - expenses;

  const expenseByCategory = transactions
    .filter(t => t.type === 'expense')
    .reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + t.amount;
      return acc;
    }, {});

  const pieData = Object.entries(expenseByCategory).map(([name, value]) => ({ name, value }));

  const weeklyData = [1,2,3,4].map(week => {
    const weekTransactions = transactions.filter(t => {
      const d = new Date(t.date);
      const day = d.getDate();
      return Math.ceil(day / 7) === week;
    });
    return {
      name: `W${week}`,
      Income: weekTransactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0),
      Expenses: weekTransactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0),
    };
  });

  const prevMonth = () => {
    if (currentMonth === 0) onMonthChange(11, currentYear - 1);
    else onMonthChange(currentMonth - 1, currentYear);
  };

  const nextMonth = () => {
    if (currentMonth === 11) onMonthChange(0, currentYear + 1);
    else onMonthChange(currentMonth + 1, currentYear);
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <button onClick={prevMonth} style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.4rem 0.8rem', color: '#64748b' }}>◀</button>
        <h2 style={{ fontWeight: 700, color: '#1e293b' }}>{MONTHS[currentMonth]} {currentYear}</h2>
        <button onClick={nextMonth} style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.4rem 0.8rem', color: '#64748b' }}>▶</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Income', value: income, color: '#22c55e', bg: '#f0fdf4' },
          { label: 'Expenses', value: expenses, color: '#ef4444', bg: '#fef2f2' },
          { label: 'Balance', value: balance, color: balance >= 0 ? '#6366f1' : '#ef4444', bg: '#eef2ff' }
        ].map(card => (
          <div key={card.label} style={{ background: card.bg, borderRadius: '12px', padding: '1.25rem', textAlign: 'center' }}>
            <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '0.5rem', fontWeight: 500 }}>{card.label}</p>
            <p style={{ fontSize: '1.1rem', fontWeight: 700, color: card.color }}>{fmt(card.value)}</p>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <div style={{ background: 'white', borderRadius: '12px', padding: '1.25rem', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: '#1e293b', marginBottom: '1rem' }}>Expenses by Category</h3>
          {pieData.length === 0 ? (
            <p style={{ color: '#94a3b8', fontSize: '0.85rem', textAlign: 'center', padding: '2rem 0' }}>No expenses this month</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value">
                  {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v) => fmt(v)} />
                <Legend formatter={(value) => <span style={{ fontSize: '0.75rem' }}>{value}</span>} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        <div style={{ background: 'white', borderRadius: '12px', padding: '1.25rem', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: '#1e293b', marginBottom: '1rem' }}>Weekly Overview</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={weeklyData}>
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
              <Tooltip formatter={(v) => fmt(v)} />
              <Legend formatter={(value) => <span style={{ fontSize: '0.75rem' }}>{value}</span>} />
              <Bar dataKey="Income" fill="#22c55e" radius={[4,4,0,0]} />
              <Bar dataKey="Expenses" fill="#ef4444" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
