import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const s = {
  nav: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '0 2rem', height: '56px',
    background: '#fff', borderBottom: '1px solid #E0DBD0',
    position: 'sticky', top: 0, zIndex: 10,
  },
  brand: {
    fontFamily: "'Lora', Georgia, serif", fontSize: '18px', fontWeight: 600,
    color: '#8B6914', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px',
  },
  right: { display: 'flex', alignItems: 'center', gap: '10px' },
  ghost: {
    padding: '6px 16px', borderRadius: '8px', border: '1px solid #E0DBD0',
    background: 'transparent', color: '#6B6355', fontSize: '13.5px',
    cursor: 'pointer', textDecoration: 'none',
  },
  solid: {
    padding: '6px 16px', borderRadius: '8px', border: '1px solid #8B6914',
    background: '#8B6914', color: '#fff', fontSize: '13.5px',
    cursor: 'pointer', textDecoration: 'none',
  },
  name: { fontSize: '13.5px', color: '#6B6355' },
};

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <nav style={s.nav}>
      <Link to="/" style={s.brand}>⚖ JudicialRAG</Link>
      <div style={s.right}>
        {user ? (
          <>
            <span style={s.name}>Hi, {user.name || user.email}</span>
            <button style={s.ghost} onClick={() => { logout(); navigate('/'); }}>Sign out</button>
          </>
        ) : (
          <>
            <Link to="/login" style={s.ghost}>Log in</Link>
            <Link to="/signup" style={s.solid}>Sign up</Link>
          </>
        )}
      </div>
    </nav>
  );
}
