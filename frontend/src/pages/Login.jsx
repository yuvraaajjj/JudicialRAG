import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const submit = (e) => {
    e.preventDefault();
    if (!email || !password) { setError('Please fill in all fields.'); return; }
    const err = login(email, password);
    if (err) { setError(err); return; }
    navigate('/');
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}>
      <Navbar />
      <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 1.5rem' }}>
        <div style={{ width: '100%', maxWidth: '380px' }}>
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div style={{ fontSize: '28px', marginBottom: '0.5rem' }}>⚖</div>
            <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '22px', fontWeight: 600 }}>Welcome back</h1>
            <p style={{ fontSize: '14px', color: 'var(--text-sub)', marginTop: '4px' }}>Sign in to continue</p>
          </div>

          <form onSubmit={submit} style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {error && <div style={{ padding: '10px 12px', background: '#FDF0F0', border: '1px solid #E8C5C5', borderRadius: '8px', fontSize: '13.5px', color: 'var(--red)' }}>{error}</div>}

            <Field label="Email" type="email" value={email} onChange={setEmail} placeholder="you@example.com" />
            <Field label="Password" type="password" value={password} onChange={setPassword} placeholder="••••••••" />

            <button type="submit" style={btnStyle}>Sign In</button>
          </form>

          <p style={{ textAlign: 'center', marginTop: '1.25rem', fontSize: '13.5px', color: 'var(--text-sub)' }}>
            No account? <Link to="/signup">Sign up</Link>
          </p>
        </div>
      </main>
    </div>
  );
}

function Field({ label, type, value, onChange, placeholder }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
      <label style={{ fontSize: '12.5px', fontWeight: 500, color: 'var(--text-sub)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        style={{ padding: '9px 12px', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '15px', color: 'var(--text)', outline: 'none', background: '#FAFAF8' }} />
    </div>
  );
}

const btnStyle = {
  padding: '10px', borderRadius: '8px', border: 'none',
  background: 'var(--gold)', color: '#fff', fontSize: '14.5px', fontWeight: 500, cursor: 'pointer',
};
