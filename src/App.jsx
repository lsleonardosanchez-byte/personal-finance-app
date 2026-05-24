function CategoriesEditor({ categories, onSave }) {
  const [income, setIncome] = useState(categories.income.join(', '));
  const [expense, setExpense] = useState(categories.expense.join(', '));
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    onSave({
      income: income.split(',').map(s => s.trim()).filter(Boolean),
      expense: expense.split(',').map(s => s.trim()).filter(Boolean)
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div style={{ maxWidth: '500px', margin: '0 auto' }}>
      <h2 style={{ marginBottom: '1.5rem', color: '#1e293b' }}>Edit Categories</h2>
      <div style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, color: '#22c55e' }}>Income Categories</label>
        <input value={income} onChange={e => setIncome(e.target.value)}
          style={{ width: '100%', padding: '0.6rem', border: '1px solid #e2e8f0', borderRadius: '8px', marginBottom: '1rem' }}
          placeholder="Salary, Freelance, Other" />
        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, color: '#ef4444' }}>Expense Categories</label>
        <input value={expense} onChange={e => setExpense(e.target.value)}
          style={{ width: '100%', padding: '0.6rem', border: '1px solid #e2e8f0', borderRadius: '8px', marginBottom: '1.5rem' }}
          placeholder="Rent, Food, Transport" />
        <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '1rem' }}>Separate categories with commas</p>
        <button onClick={handleSave} style={{
          width: '100%', padding: '0.75rem', background: '#6366f1',
          color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600
        }}>
          {saved ? 'Saved!' : 'Save Categories'}
        </button>
      </div>
    </div>
  );
}
