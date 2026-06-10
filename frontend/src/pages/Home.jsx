import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';

export default function Home() {
  const [question, setQuestion] = useState('');
  const [result, setResult] = useState(null);   // { answer, citations, validation, approved }
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { user } = useAuth();
  const navigate = useNavigate();

  const ask = async () => {
    if (!question.trim()) return;
    if (!user) { navigate('/login'); return; }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const res = await fetch('/api/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: question.trim() }),
      });
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const data = await res.json();
      setResult(data);
    } catch (e) {
      setError(`Could not reach the backend. Make sure the FastAPI server is running.\n${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); ask(); }
  };

  const clear = () => { setQuestion(''); setResult(null); setError(''); };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}>
      <Navbar />

      <main style={{ flex: 1, maxWidth: '700px', width: '100%', margin: '0 auto', padding: '3rem 1.5rem 4rem' }}>

        {/* Welcome */}
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div style={{ fontSize: '32px', marginBottom: '0.75rem' }}>⚖</div>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '28px', fontWeight: 600, color: 'var(--text)', marginBottom: '0.5rem' }}>
            Indian Legal Research Assistant
          </h1>
          <p style={{ color: 'var(--text-sub)', fontSize: '14.5px', maxWidth: '480px', margin: '0 auto', lineHeight: 1.7 }}>
            Ask any question about Indian civil procedure, commercial disputes, or arbitration law.
            Answers are sourced from real court judgements.
          </p>
          {!user && (
            <p style={{ marginTop: '0.75rem', fontSize: '13px', color: 'var(--text-muted)' }}>
              <a href="/login">Log in</a> or <a href="/signup">sign up</a> to ask questions.
            </p>
          )}
        </div>

        {/* Input */}
        <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
          <textarea
            value={question}
            onChange={e => setQuestion(e.target.value)}
            onKeyDown={handleKey}
            placeholder="e.g. Under what circumstances can a suit be withdrawn with liberty to file again?"
            rows={4}
            style={{
              display: 'block', width: '100%', padding: '16px', border: 'none',
              outline: 'none', resize: 'vertical', fontSize: '15px', lineHeight: 1.6,
              color: 'var(--text)', background: 'transparent', minHeight: '110px',
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', padding: '10px 12px', borderTop: '1px solid var(--border)', background: '#FAFAF8' }}>
            {(result || error) && (
              <button onClick={clear} style={{ padding: '7px 16px', borderRadius: '8px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-sub)', fontSize: '13.5px' }}>
                Clear
              </button>
            )}
            <button
              onClick={ask}
              disabled={loading || !question.trim()}
              style={{
                padding: '7px 20px', borderRadius: '8px', border: 'none',
                background: loading || !question.trim() ? '#C8B87A' : 'var(--gold)',
                color: '#fff', fontSize: '13.5px', fontWeight: 500,
                cursor: loading || !question.trim() ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', gap: '7px',
              }}
            >
              {loading && (
                <span style={{ width: '14px', height: '14px', border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />
              )}
              {loading ? 'Researching…' : 'Ask'}
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div style={{ marginTop: '1.5rem', padding: '14px 16px', borderRadius: 'var(--radius)', background: '#FDF0F0', border: '1px solid #E8C5C5', color: 'var(--red)', fontSize: '13.5px', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
            {error}
          </div>
        )}

        {/* Result */}
        {result && (
          <div style={{ marginTop: '1.5rem', animation: 'fadeIn 0.35s ease both' }}>

            {/* Validation badge */}
            {result.validation && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem' }}>
                <span style={{
                  fontSize: '12px', padding: '3px 10px', borderRadius: '99px', fontWeight: 500,
                  background: result.approved ? '#EFF7EE' : '#FDF0F0',
                  color: result.approved ? '#2D6A2D' : 'var(--red)',
                  border: `1px solid ${result.approved ? '#B0D9B0' : '#E8C5C5'}`,
                }}>
                  {result.approved ? '✓ Validated by Judge Mode' : '⚠ Validation Issues'}
                </span>
              </div>
            )}

            {/* Answer */}
            <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '20px 22px' }}>
              <div style={{ fontFamily: 'var(--font-serif)', fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Answer
              </div>
              <div style={{ fontSize: '14.5px', lineHeight: 1.8, color: 'var(--text)', whiteSpace: 'pre-wrap' }}>
                {result.answer}
              </div>
            </div>

            {/* Citations */}
            {result.citations && result.citations.length > 0 && (
              <div style={{ marginTop: '1rem' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>
                  Sources
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {result.citations.map((c, i) => (
                    <div key={i} style={{ background: 'var(--gold-bg)', border: '1px solid #E8D99A', borderRadius: 'var(--radius)', padding: '12px 14px', fontSize: '13px', lineHeight: 1.6 }}>
                      <span style={{ fontWeight: 500, color: 'var(--gold)', marginRight: '8px' }}>[{i + 1}]</span>
                      {c.court && <span style={{ color: 'var(--text-sub)' }}>{c.court}</span>}
                      {c.case_numbers && <span style={{ color: 'var(--text-muted)' }}> · {c.case_numbers}</span>}
                      {c.date_of_decision && <span style={{ color: 'var(--text-muted)' }}> · {c.date_of_decision}</span>}
                      {c.source && <div style={{ color: 'var(--text-muted)', fontSize: '12px', fontFamily: 'monospace', marginTop: '2px' }}>{c.source}</div>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Validation detail (collapsed by default) */}
            {result.validation && <ValidationDetail text={result.validation} />}
          </div>
        )}
      </main>

      <footer style={{ textAlign: 'center', padding: '1.25rem', borderTop: '1px solid var(--border)', fontSize: '12px', color: 'var(--text-muted)' }}>
        JudicialRAG is a research tool and does not constitute legal advice.
      </footer>
    </div>
  );
}

function ValidationDetail({ text }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ marginTop: '1rem' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{ fontSize: '12.5px', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: '5px' }}
      >
        <span style={{ fontSize: '10px' }}>{open ? '▼' : '▶'}</span>
        {open ? 'Hide' : 'Show'} judge-mode validation report
      </button>
      {open && (
        <div style={{ marginTop: '8px', padding: '14px', background: '#FAFAF8', border: '1px solid var(--border)', borderRadius: 'var(--radius)', fontSize: '12.5px', color: 'var(--text-sub)', whiteSpace: 'pre-wrap', lineHeight: 1.65, fontFamily: 'monospace', maxHeight: '260px', overflowY: 'auto' }}>
          {text}
        </div>
      )}
    </div>
  );
}
