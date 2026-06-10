import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';

const API_BASE = 'http://localhost:5000';

// ── Markdown-lite renderer ─────────────────────────────────────────────────
// Handles: **bold**, *italic*, `code`, ```blocks```, # headings, - lists, numbered lists
function parseMarkdown(text) {
  if (!text) return [];

  const lines = text.split('\n');
  const blocks = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Fenced code block
    if (line.startsWith('```')) {
      const lang = line.slice(3).trim();
      const codeLines = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      blocks.push({ type: 'code', lang, content: codeLines.join('\n') });
      i++;
      continue;
    }

    // Headings
    const h3 = line.match(/^### (.+)/);
    const h2 = line.match(/^## (.+)/);
    const h1 = line.match(/^# (.+)/);
    if (h1) { blocks.push({ type: 'h1', content: h1[1] }); i++; continue; }
    if (h2) { blocks.push({ type: 'h2', content: h2[1] }); i++; continue; }
    if (h3) { blocks.push({ type: 'h3', content: h3[1] }); i++; continue; }

    // Bullet list
    if (line.match(/^[-*] /)) {
      const items = [];
      while (i < lines.length && lines[i].match(/^[-*] /)) {
        items.push(lines[i].replace(/^[-*] /, ''));
        i++;
      }
      blocks.push({ type: 'ul', items });
      continue;
    }

    // Numbered list
    if (line.match(/^\d+\. /)) {
      const items = [];
      while (i < lines.length && lines[i].match(/^\d+\. /)) {
        items.push(lines[i].replace(/^\d+\. /, ''));
        i++;
      }
      blocks.push({ type: 'ol', items });
      continue;
    }

    // Blockquote
    if (line.startsWith('> ')) {
      blocks.push({ type: 'blockquote', content: line.slice(2) });
      i++;
      continue;
    }

    // Horizontal rule
    if (line.match(/^---+$/)) {
      blocks.push({ type: 'hr' });
      i++;
      continue;
    }

    // Empty line
    if (line.trim() === '') {
      i++;
      continue;
    }

    // Paragraph
    blocks.push({ type: 'p', content: line });
    i++;
  }

  return blocks;
}

function inlineFormat(text) {
  // Split on **bold**, *italic*, `code` markers
  const parts = [];
  const regex = /(\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`)/g;
  let last = 0;
  let m;
  while ((m = regex.exec(text)) !== null) {
    if (m.index > last) parts.push(<span key={last}>{text.slice(last, m.index)}</span>);
    if (m[2]) parts.push(<strong key={m.index} style={{ fontWeight: 600 }}>{m[2]}</strong>);
    else if (m[3]) parts.push(<em key={m.index}>{m[3]}</em>);
    else if (m[4]) parts.push(
      <code key={m.index} style={{
        fontFamily: 'monospace', fontSize: '0.88em',
        background: '#F0EBE0', padding: '1px 5px', borderRadius: '4px', color: '#7A5C1E'
      }}>{m[4]}</code>
    );
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(<span key={last}>{text.slice(last)}</span>);
  return parts.length ? parts : text;
}

function MarkdownBlock({ block }) {
  switch (block.type) {
    case 'h1': return <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '19px', fontWeight: 700, margin: '1.2rem 0 0.4rem', color: 'var(--text)' }}>{inlineFormat(block.content)}</h2>;
    case 'h2': return <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '17px', fontWeight: 600, margin: '1rem 0 0.35rem', color: 'var(--text)' }}>{inlineFormat(block.content)}</h3>;
    case 'h3': return <h4 style={{ fontSize: '14.5px', fontWeight: 600, margin: '0.9rem 0 0.3rem', color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{inlineFormat(block.content)}</h4>;
    case 'p': return <p style={{ margin: '0.25rem 0', lineHeight: 1.7, fontSize: '14.5px' }}>{inlineFormat(block.content)}</p>;
    case 'ul': return (
      <ul style={{ margin: '0.4rem 0', paddingLeft: '1.4rem', display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {block.items.map((item, i) => <li key={i} style={{ fontSize: '14.5px', lineHeight: 1.65 }}>{inlineFormat(item)}</li>)}
      </ul>
    );
    case 'ol': return (
      <ol style={{ margin: '0.4rem 0', paddingLeft: '1.4rem', display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {block.items.map((item, i) => <li key={i} style={{ fontSize: '14.5px', lineHeight: 1.65 }}>{inlineFormat(item)}</li>)}
      </ol>
    );
    case 'blockquote': return (
      <blockquote style={{
        borderLeft: '3px solid var(--gold)', paddingLeft: '1rem', margin: '0.6rem 0',
        color: '#7A6A50', fontStyle: 'italic', fontSize: '14px'
      }}>{inlineFormat(block.content)}</blockquote>
    );
    case 'code': return (
      <pre style={{
        background: '#F7F3EC', border: '1px solid #E0D8C8', borderRadius: '8px',
        padding: '12px 14px', margin: '0.6rem 0', overflowX: 'auto',
        fontSize: '13px', fontFamily: 'monospace', lineHeight: 1.6, color: '#3D2E1A'
      }}><code>{block.content}</code></pre>
    );
    case 'hr': return <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '0.8rem 0' }} />;
    default: return null;
  }
}

function AnswerRenderer({ text }) {
  const blocks = parseMarkdown(text);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
      {blocks.map((block, i) => <MarkdownBlock key={i} block={block} />)}
    </div>
  );
}

// ── Source card ────────────────────────────────────────────────────────────
function SourceCard({ source, index }) {
  const title = source.title || source.source || source.metadata?.title || `Source ${index + 1}`;
  const snippet = source.content || source.page_content || source.text || '';
  const meta = source.metadata || {};

  return (
    <div style={{
      background: '#FDFAF5', border: '1px solid #E8E0D0', borderRadius: '10px',
      padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '4px',
      minWidth: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
        <span style={{
          flexShrink: 0, width: '20px', height: '20px', borderRadius: '50%',
          background: 'var(--gold)', color: '#fff', fontSize: '11px', fontWeight: 600,
          display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: '1px'
        }}>{index + 1}</span>
        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', lineHeight: 1.4 }}>
          {title}
        </span>
      </div>
      {(meta.court || meta.date || meta.citation) && (
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', paddingLeft: '28px' }}>
          {meta.court && <Tag>{meta.court}</Tag>}
          {meta.date && <Tag>{meta.date}</Tag>}
          {meta.citation && <Tag muted>{meta.citation}</Tag>}
        </div>
      )}
      {snippet && (
        <p style={{ fontSize: '12.5px', color: '#7A6A50', lineHeight: 1.55, margin: 0, paddingLeft: '28px',
          display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden'
        }}>{snippet}</p>
      )}
    </div>
  );
}

function Tag({ children, muted }) {
  return (
    <span style={{
      fontSize: '11px', padding: '2px 7px', borderRadius: '20px',
      background: muted ? '#F0EBE0' : '#EDE5D4', color: muted ? '#9A8A70' : '#7A5C1E',
      fontWeight: 500, letterSpacing: '0.02em'
    }}>{children}</span>
  );
}

// ── Message bubble ─────────────────────────────────────────────────────────
function Message({ msg }) {
  const isUser = msg.role === 'user';
  const [showSources, setShowSources] = useState(false);
  const sources = msg.sources || msg.documents || msg.context || [];

  if (isUser) {
    return (
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <div style={{
          maxWidth: '72%', background: 'var(--gold)', color: '#fff',
          borderRadius: '16px 16px 4px 16px', padding: '10px 16px',
          fontSize: '14.5px', lineHeight: 1.55
        }}>{msg.content}</div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
      <div style={{
        flexShrink: 0, width: '28px', height: '28px', borderRadius: '50%',
        background: '#EDE5D4', display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '14px', marginTop: '2px'
      }}>⚖</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          background: '#fff', border: '1px solid var(--border)', borderRadius: '4px 16px 16px 16px',
          padding: '14px 16px', color: 'var(--text)'
        }}>
          {msg.loading ? (
            <ThinkingDots />
          ) : (
            <AnswerRenderer text={msg.content} />
          )}
        </div>

        {/* Sources toggle */}
        {!msg.loading && sources.length > 0 && (
          <div style={{ marginTop: '8px' }}>
            <button
              onClick={() => setShowSources(v => !v)}
              style={{
                display: 'flex', alignItems: 'center', gap: '5px',
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: '12.5px', color: '#9A8A70', padding: '2px 0',
              }}
            >
              <span style={{
                display: 'inline-block', transition: 'transform 0.15s',
                transform: showSources ? 'rotate(90deg)' : 'rotate(0deg)'
              }}>▶</span>
              {sources.length} source{sources.length !== 1 ? 's' : ''} retrieved
            </button>
            {showSources && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
                {sources.map((src, i) => <SourceCard key={i} source={src} index={i} />)}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ThinkingDots() {
  return (
    <div style={{ display: 'flex', gap: '5px', padding: '4px 0', alignItems: 'center' }}>
      {[0, 1, 2].map(i => (
        <span key={i} style={{
          width: '7px', height: '7px', borderRadius: '50%', background: '#C8B89A',
          display: 'inline-block',
          animation: 'bounce 1.2s ease-in-out infinite',
          animationDelay: `${i * 0.2}s`,
        }} />
      ))}
      <style>{`@keyframes bounce { 0%,80%,100%{transform:translateY(0)} 40%{transform:translateY(-6px)} }`}</style>
    </div>
  );
}

// ── Suggested questions ────────────────────────────────────────────────────
const SUGGESTIONS = [
  'What are the grounds for bail under CrPC Section 437?',
  'Explain the doctrine of basic structure in Indian constitutional law.',
  'What constitutes a valid contract under the Indian Contract Act?',
  'How is maintenance determined under Section 125 CrPC?',
];

// ── Main Home component ────────────────────────────────────────────────────
export default function Home() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [backendOk, setBackendOk] = useState(null); // null=unknown, true/false
  const bottomRef = useRef(null);
  const textareaRef = useRef(null);

  // Health check on mount
  useEffect(() => {
    fetch(`${API_BASE}/check`)
      .then(r => r.ok ? setBackendOk(true) : setBackendOk(false))
      .catch(() => setBackendOk(false));
  }, []);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 160) + 'px';
  }, [input]);

  const sendQuestion = async (question) => {
    if (!question.trim() || loading) return;

    if (!user) { navigate('/login'); return; }

    const userMsg = { role: 'user', content: question };
    const loadingMsg = { role: 'assistant', content: '', loading: true, id: Date.now() };

    setMessages(prev => [...prev, userMsg, loadingMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ question }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Server error ${res.status}`);
      }

      const data = await res.json();

      // Flexible response parsing — handles common RAG output shapes:
      // { answer, documents } | { generation, documents } | { answer } | { response } | string
      const answerText =
        data.answer ??
        data.generation ??
        data.response ??
        data.result ??
        (typeof data === 'string' ? data : JSON.stringify(data, null, 2));

      const sources =
        data.documents ??
        data.sources ??
        data.context ??
        data.retrieved_docs ??
        [];

      setMessages(prev => prev.map(m =>
        m.id === loadingMsg.id
          ? { role: 'assistant', content: answerText, sources }
          : m
      ));
    } catch (err) {
      setMessages(prev => prev.map(m =>
        m.id === loadingMsg.id
          ? { role: 'assistant', content: `**Error:** ${err.message}. Please try again.`, sources: [] }
          : m
      ));
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendQuestion(input);
    }
  };

  const isEmpty = messages.length === 0;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}>
      <Navbar />

      {/* Backend status banner */}
      {backendOk === false && (
        <div style={{
          background: '#FDF0F0', borderBottom: '1px solid #E8C5C5',
          padding: '8px 2rem', fontSize: '13px', color: 'var(--red)', textAlign: 'center'
        }}>
          ⚠ Cannot reach the backend at {API_BASE}. Make sure Flask is running.
        </div>
      )}

      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', maxWidth: '780px', width: '100%', margin: '0 auto', padding: '0 1.5rem' }}>

        {/* Empty state */}
        {isEmpty && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingBottom: '6rem', gap: '1.5rem' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '36px', marginBottom: '0.75rem' }}>⚖</div>
              <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '24px', fontWeight: 600, margin: 0 }}>
                Ask anything about Indian law
              </h1>
              <p style={{ fontSize: '14px', color: 'var(--text-sub)', marginTop: '6px' }}>
                Powered by retrieval-augmented generation over legal documents
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', width: '100%', maxWidth: '560px' }}>
              {SUGGESTIONS.map((s, i) => (
                <button key={i} onClick={() => sendQuestion(s)} style={{
                  textAlign: 'left', padding: '10px 14px', background: '#fff',
                  border: '1px solid var(--border)', borderRadius: '10px',
                  fontSize: '13px', color: 'var(--text)', cursor: 'pointer', lineHeight: 1.45,
                  transition: 'border-color 0.15s, box-shadow 0.15s',
                }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--gold)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(139,105,20,0.1)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none'; }}
                >{s}</button>
              ))}
            </div>
          </div>
        )}

        {/* Message thread */}
        {!isEmpty && (
          <div style={{ flex: 1, paddingTop: '2rem', paddingBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {messages.map((msg, i) => <Message key={i} msg={msg} />)}
            <div ref={bottomRef} />
          </div>
        )}

      </main>

      {/* Sticky input bar */}
      <div style={{
        position: 'sticky', bottom: 0, background: 'linear-gradient(to top, var(--bg) 80%, transparent)',
        paddingTop: '1rem', paddingBottom: '1.5rem',
      }}>
        <div style={{ maxWidth: '780px', margin: '0 auto', padding: '0 1.5rem' }}>
          <div style={{
            display: 'flex', gap: '10px', alignItems: 'flex-end',
            background: '#fff', border: '1.5px solid var(--border)', borderRadius: '14px',
            padding: '10px 12px', boxShadow: '0 2px 12px rgba(0,0,0,0.07)',
            transition: 'border-color 0.15s',
          }}
            onFocusCapture={e => e.currentTarget.style.borderColor = 'var(--gold)'}
            onBlurCapture={e => e.currentTarget.style.borderColor = 'var(--border)'}
          >
            <textarea
              ref={textareaRef}
              rows={1}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={user ? 'Ask a legal question…' : 'Sign in to ask a question'}
              disabled={!user || loading}
              style={{
                flex: 1, resize: 'none', border: 'none', outline: 'none',
                fontSize: '14.5px', color: 'var(--text)', background: 'transparent',
                fontFamily: 'inherit', lineHeight: 1.55, minHeight: '24px',
              }}
            />
            <button
              onClick={() => sendQuestion(input)}
              disabled={!input.trim() || loading || !user}
              style={{
                flexShrink: 0, width: '34px', height: '34px', borderRadius: '9px', border: 'none',
                background: input.trim() && !loading && user ? 'var(--gold)' : '#E8E0D0',
                color: input.trim() && !loading && user ? '#fff' : '#B0A090',
                cursor: input.trim() && !loading && user ? 'pointer' : 'not-allowed',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '15px', transition: 'background 0.15s',
              }}
              title="Send (Enter)"
            >↑</button>
          </div>
          {!user && (
            <p style={{ textAlign: 'center', fontSize: '12.5px', color: 'var(--text-sub)', marginTop: '8px' }}>
              <a href="/login" style={{ color: 'var(--gold)' }}>Sign in</a> or <a href="/signup" style={{ color: 'var(--gold)' }}>create an account</a> to ask questions
            </p>
          )}
        </div>
      </div>
    </div>
  );
}