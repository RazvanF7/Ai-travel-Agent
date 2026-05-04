import React, { useState, useEffect } from 'react';
import { chat, checklists, finance } from '../services/api';

export default function TravelToolsSidebar({ trip }) {
  const [loading, setLoading] = useState(true);
  const [latestMessage, setLatestMessage] = useState(null);
  const [checklistItems, setChecklistItems] = useState([]);
  const [expensesData, setExpensesData] = useState({ total: 0, breakdown: [] });

  useEffect(() => {
    if (!trip) return;

    let isMounted = true;
    
    async function fetchPreviewData() {
      try {
        setLoading(true);
        // Fetch all data in parallel
        const [chatRes, checklistRes, financeRes] = await Promise.all([
          chat.history(trip.group).catch(() => []),
          checklists.list(trip.id).catch(() => []),
          finance.expenses(trip.id).catch(() => [])
        ]);

        if (!isMounted) return;

        // 1. Chat logic
        if (chatRes.length > 0) {
          const lastMsg = chatRes[chatRes.length - 1];
          setLatestMessage(lastMsg);
        }

        // 2. Checklist logic (Top 3 uncompleted)
        const uncompleted = checklistRes.filter(item => !item.is_completed);
        setChecklistItems(uncompleted.slice(0, 3));

        // 3. Finance logic
        const totals = {
          Transport: 0,
          Food: 0,
          Lodging: 0,
          Other: 0
        };
        let grandTotal = 0;

        financeRes.forEach(exp => {
          const amount = parseFloat(exp.amount) || 0;
          grandTotal += amount;
          if (totals[exp.category] !== undefined) {
            totals[exp.category] += amount;
          } else {
            totals.Other += amount;
          }
        });

        const breakdown = [
          { name: 'Transport', amount: totals.Transport, color: '#d4af37' },
          { name: 'Food', amount: totals.Food, color: '#b8860b' },
          { name: 'Lodging', amount: totals.Lodging, color: '#fef08a' },
          { name: 'Other', amount: totals.Other, color: '#cbd5e1' }
        ].filter(cat => cat.amount > 0);

        // If no expenses, show generic placeholder
        if (breakdown.length === 0) {
          breakdown.push({ name: 'Empty', amount: 1, color: '#e2e8f0' });
        }

        setExpensesData({ total: grandTotal, breakdown });
      } catch (err) {
        console.error('Failed to load preview data:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchPreviewData();

    return () => { isMounted = false; };
  }, [trip]);

  if (!trip) return null;

  // Donut chart helpers
  const radius = 30;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="sidebar-container">
      <h2 className="sidebar-title">Travel Tools Preview</h2>

      {/* AI Chat Card */}
      <div className="sidebar-card">
        <div className="sidebar-card-header">AI Chat Card</div>
        <div className="ai-bubble">
          {loading ? (
            <span style={{ color: '#94a3b8' }}>Loading chat...</span>
          ) : latestMessage ? (
            <>
              <span style={{ fontSize: '1.5rem' }}>{latestMessage.role === 'ai' ? '🤖' : '👤'}</span> 
              <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {latestMessage.role === 'ai' ? 'AI: ' : 'You: '} {latestMessage.content}
              </span>
            </>
          ) : (
            <>
              <span style={{ fontSize: '1.5rem' }}>🤖</span> AI: Ask me anything!
            </>
          )}
        </div>
      </div>

      {/* Checklist Card */}
      <div className="sidebar-card">
        <div className="sidebar-card-header">Checklist Card</div>
        {loading ? (
           <div style={{ fontSize: '0.875rem', color: '#94a3b8' }}>Loading items...</div>
        ) : checklistItems.length > 0 ? (
          <>
            {checklistItems.map(item => (
              <div key={item.id} className="checklist-item-preview">
                <div className="check-circle" style={{ background: '#e2e8f0', color: '#e2e8f0' }}></div>
                <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {item.title}
                </span>
              </div>
            ))}
            <div style={{ textAlign: 'right', marginTop: 8 }}>
              <span style={{ fontSize: '1.5rem' }}>📋</span>
            </div>
          </>
        ) : (
          <div style={{ fontSize: '0.875rem', color: '#94a3b8' }}>No pending tasks! 🎉</div>
        )}
      </div>

      {/* Expenses Card */}
      <div className="sidebar-card">
        <div className="sidebar-card-header">Expenses Card</div>
        {loading ? (
          <div style={{ fontSize: '0.875rem', color: '#94a3b8' }}>Loading expenses...</div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ position: 'relative', width: 80, height: 80 }}>
              <svg width="80" height="80" viewBox="0 0 80 80" style={{ transform: 'rotate(-90deg)' }}>
                {expensesData.breakdown.map((cat, idx) => {
                  const percent = expensesData.total > 0 ? cat.amount / expensesData.total : 1;
                  const strokeDasharray = `${percent * circumference} ${circumference}`;
                  const strokeDashoffset = -offset;
                  offset += percent * circumference;
                  return (
                    <circle
                      key={idx}
                      cx="40"
                      cy="40"
                      r={radius}
                      fill="transparent"
                      stroke={cat.color}
                      strokeWidth="12"
                      strokeDasharray={strokeDasharray}
                      strokeDashoffset={strokeDashoffset}
                    />
                  );
                })}
              </svg>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ fontSize: '0.625rem', textAlign: 'center', fontWeight: 600, color: '#1a1a1a' }}>
                  {expensesData.total > 0 ? `${expensesData.total} ${trip.currency || '$'}` : 'No\nExpenses'}
                </div>
              </div>
            </div>
            
            <div style={{ fontSize: '0.8125rem', fontWeight: 500, color: '#475569', display: 'flex', flexDirection: 'column', gap: 4 }}>
              {expensesData.breakdown.filter(cat => cat.name !== 'Empty').map(cat => (
                <div key={cat.name} style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                  <span><span style={{ color: cat.color }}>●</span> {cat.name}</span>
                </div>
              ))}
              {expensesData.total === 0 && <div>Start tracking!</div>}
            </div>
          </div>
        )}
      </div>

      {/* AI Concierge Card */}
      <div className="sidebar-card">
        <div className="sidebar-card-header">AI Concierge Card</div>
        <div style={{ textAlign: 'center', marginBottom: 12 }}>
          <span style={{ fontSize: '3rem' }}>🤖</span>
        </div>
        <div className="search-bar-preview">
          <span style={{ flex: 1 }}>Find me a quiet tea house</span>
          <span style={{ background: '#d4af37', width: 24, height: 24, borderRadius: '50%', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem' }}>🔍</span>
        </div>
      </div>
    </div>
  );
}
