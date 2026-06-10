import { createContext, useContext, useState, useEffect } from 'react';

const Ctx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const u = localStorage.getItem('jr_user');
    if (u) try {setUser(JSON.parse(u)); } catch {}
  }, []);

  const login = (email, password) => {
    const users = JSON.parse(localStorage.getItem('jr_users') || '[]');
    const found = users.find(u => u.email === email && u.password === password);
    if (!found) return 'Invalid email or password.';
    setUser(found);
    localStorage.setItem('jr_user', JSON.stringify(found));
    return null;
  };

  const signup = (name, email, password) => {
    const users = JSON.parse(localStorage.getItem('jr_users') || '[]');
    if (users.find(u => u.email === email)) return 'Account already exists.';
    const u = { name, email, password };
    users.push(u);
    localStorage.setItem('jr_users', JSON.stringify(users));
    setUser(u);
    localStorage.setItem('jr_user', JSON.stringify(u));
    return null;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('jr_user');
  };

  return <Ctx.Provider value={{ user, login, signup, logout }}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);
