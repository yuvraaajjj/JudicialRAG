import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';

export default function Signup() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { signup } = useAuth();
  const navigate = useNavigate();

  const submit = (e) => {
    e.preventDefault();
    if (!name || !email || !password) { setError('Please fill in all fields.'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    const err = signup(name, email, password);
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
            <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '22px', fontWeight: 600 }}>Create account</h1>
            <p style={{ fontSize: '14px', color: 'var(--text-sub)', marginTop: '4px' }}>Start researching Indian law</p>
          </div>

          <form onSubmit={submit} style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {error && <div style={{ padding: '10px 12px', background: '#FDF0F0', border: '1px solid #E8C5C5', borderRadius: '8px', fontSize: '13.5px', color: 'var(--red)' }}>{error}</div>}

            <Field label="Name" type="text" value={name} onChange={setName} placeholder="Ravi Kumar" />
            <Field label="Email" type="email" value={email} onChange={setEmail} placeholder="you@example.com" />
            <Field label="Password" type="password" value={password} onChange={setPassword} placeholder="Min. 6 characters" />

            <button type="submit" style={btnStyle}>Create Account</button>
          </form>

          <p style={{ textAlign: 'center', marginTop: '1.25rem', fontSize: '13.5px', color: 'var(--text-sub)' }}>
            Already have an account? <Link to="/login">Log in</Link>
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
