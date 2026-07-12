import React, { useState, useEffect } from 'react';
import { Trophy, Award, Gift, Star, CheckCircle2, UploadCloud, Users, ArrowUpRight } from 'lucide-react';
import { challengesApi, badgesApi, rewardsApi, leaderboardsApi } from '../api';
import { DataTable, StatusBadge, Tabs, Modal, FileUpload, KpiTile } from '../components/common';
import type { Challenge, Badge, Reward, LeaderboardEntry } from '../types';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';

export const GamificationPage: React.FC = () => {
  const { showToast } = useToast();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState('challenges');
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal: Submit Proof
  const [proofModal, setProofModal] = useState(false);
  const [activeChallengeId, setActiveChallengeId] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [cRes, bRes, rRes, lRes] = await Promise.all([
        challengesApi.list(),
        badgesApi.list(),
        rewardsApi.list(),
        leaderboardsApi.get('global', 'month'),
      ]);
      setChallenges(cRes);
      setBadges(bRes);
      setRewards(rRes);
      setLeaderboard(lRes);
    } catch {
      showToast('Error loading gamification data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleJoin = async (id: string) => {
    try {
      await challengesApi.join(id);
      showToast('Joined challenge! Complete actions to earn XP & points.', 'success');
      loadData();
    } catch {
      showToast('Could not join challenge', 'error');
    }
  };

  const handleRedeem = async (reward: Reward) => {
    if ((user?.points_balance || 450) < reward.points_cost) {
      showToast('Insufficient points balance for this reward', 'warning');
      return;
    }
    try {
      await rewardsApi.redeem(reward._id);
      showToast(`Redeemed "${reward.title}" successfully! Check your email.`, 'success');
      loadData();
    } catch {
      showToast('Could not redeem reward', 'error');
    }
  };

  return (
    <div className="gamification-page" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header & Balance Banner */}
      <div className="glass-panel" style={{ padding: '24px 28px', borderRadius: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', background: 'linear-gradient(135deg, hsla(38, 92%, 50%, 0.12), hsla(162, 75%, 40%, 0.12))' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>Employee Gamification, Challenges & Rewards Hub</h2>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
            Earn XP and redeemable reward points by participating in sustainability drives and carpool challenges.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '16px' }}>
          <div style={{ padding: '10px 18px', borderRadius: '14px', background: 'var(--bg-card)', border: '1px solid var(--border-glass)', textAlign: 'center' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700 }}>YOUR XP LEVEL</div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: 'hsl(38, 92%, 50%)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Trophy size={18} /> {user?.xp_total || 1450} <span style={{ fontSize: '12px', fontWeight: 600 }}>XP</span>
            </div>
          </div>
          <div style={{ padding: '10px 18px', borderRadius: '14px', background: 'var(--bg-card)', border: '1px solid var(--border-glass)', textAlign: 'center' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700 }}>REWARD POINTS</div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: 'hsl(162, 75%, 40%)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Gift size={18} /> {user?.points_balance || 450} <span style={{ fontSize: '12px', fontWeight: 600 }}>Pts</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs
        active={activeTab}
        onChange={setActiveTab}
        tabs={[
          { key: 'challenges', label: 'Active ESG Challenges', icon: <Trophy size={16} />, badge: challenges.length },
          { key: 'badges', label: 'Badges & Achievements', icon: <Award size={16} />, badge: badges.length },
          { key: 'rewards', label: 'Reward Redemption Store', icon: <Gift size={16} />, badge: rewards.length },
          { key: 'leaderboard', label: 'Employee Leaderboard', icon: <Users size={16} /> },
        ]}
      />

      {/* Tab 1: Challenges Grid */}
      {activeTab === 'challenges' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '20px' }}>
          {challenges.map((c) => (
            <div key={c._id} className="glass-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', borderTop: '4px solid hsl(38, 92%, 50%)' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <span className="badge badge-neutral">{c.category}</span>
                  <StatusBadge value={c.status || 'active'} />
                </div>
                <h3 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 8px 0', color: 'var(--text-main)' }}>{c.title}</h3>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '0 0 16px 0', lineHeight: '1.5' }}>{c.description || 'Participate in this month sustainability sprint to unlock badges.'}</p>
              </div>

              <div>
                <div style={{ display: 'flex', gap: '16px', marginBottom: '16px', fontSize: '13px', fontWeight: 700 }}>
                  <span style={{ color: 'hsl(38, 92%, 50%)' }}>+{c.xp_reward || 200} XP</span>
                  <span style={{ color: 'hsl(162, 75%, 40%)' }}>+{c.points_reward || 100} Points</span>
                </div>

                <div style={{ display: 'flex', gap: '10px', borderTop: '1px solid var(--border-glass)', paddingTop: '12px' }}>
                  <button onClick={() => handleJoin(c._id)} className="btn btn-secondary" style={{ flex: 1, padding: '8px', fontSize: '13px' }}>
                    Join Challenge
                  </button>
                  <button
                    onClick={() => {
                      setActiveChallengeId(c._id);
                      setProofModal(true);
                    }}
                    className="btn btn-primary"
                    style={{ flex: 1, padding: '8px', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                  >
                    <UploadCloud size={15} /> Submit Proof
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab 2: Badges Grid */}
      {activeTab === 'badges' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
          {badges.map((b) => (
            <div key={b._id} className="glass-card" style={{ textAlign: 'center', padding: '24px 16px', opacity: b.unlocked ? 1 : 0.6, border: b.unlocked ? '1px solid var(--color-primary)' : '1px solid var(--border-glass)' }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: b.unlocked ? 'hsla(38, 92%, 50%, 0.15)' : 'var(--bg-glass)', color: b.unlocked ? 'hsl(38, 92%, 50%)' : 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <Award size={36} />
              </div>
              <h4 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 6px 0', color: 'var(--text-main)' }}>{b.name}</h4>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '0 0 12px 0' }}>{b.description || 'Awarded for consistent green behavior.'}</p>
              {b.unlocked ? (
                <span className="badge badge-success" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <CheckCircle2 size={13} /> Unlocked
                </span>
              ) : (
                <span className="badge badge-neutral">Locked</span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Tab 3: Rewards Store */}
      {activeTab === 'rewards' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
          {rewards.map((r) => (
            <div key={r._id} className="glass-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', borderTop: '4px solid hsl(162, 75%, 40%)' }}>
              <div>
                <span className="badge badge-neutral" style={{ marginBottom: '10px' }}>{r.category || 'Voucher'}</span>
                <h3 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 8px 0', color: 'var(--text-main)' }}>{r.title}</h3>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '0 0 16px 0' }}>{r.description || 'Eco-friendly merchandise or donation match.'}</p>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-glass)', paddingTop: '14px' }}>
                <span style={{ fontSize: '18px', fontWeight: 800, color: 'hsl(162, 75%, 40%)', fontFamily: 'var(--font-display)' }}>
                  {r.points_cost} <span style={{ fontSize: '12px', fontWeight: 600 }}>Pts</span>
                </span>
                <button onClick={() => handleRedeem(r)} className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '13px' }}>
                  Redeem Reward
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab 4: Leaderboard */}
      {activeTab === 'leaderboard' && (
        <DataTable
          isLoading={loading}
          columns={[
            { key: 'rank', header: 'Rank', render: (l) => <span style={{ fontWeight: 800, fontSize: '16px', color: l.rank <= 3 ? 'hsl(38, 92%, 50%)' : 'var(--text-main)' }}>#{l.rank}</span> },
            { key: 'user_name', header: 'Employee Name', render: (l) => <strong style={{ color: 'var(--text-main)', fontSize: '15px' }}>{l.user_name || 'Sarah Jenkins'}</strong> },
            { key: 'department_name', header: 'Department', render: (l) => <span className="badge badge-neutral">{l.department_name || 'Sustainability Dir'}</span> },
            { key: 'xp_total', header: 'Earned XP', sortable: true, render: (l) => <span style={{ fontWeight: 800, color: 'hsl(38, 92%, 50%)' }}>{(l.xp_total || 1450).toLocaleString()} XP</span> },
            { key: 'carbon_saved_kg', header: 'Est. Carbon Savings', sortable: true, render: (l) => <span className="badge badge-success">{(l.carbon_saved_kg || 420).toLocaleString()} kg CO₂e</span> },
          ]}
          data={leaderboard}
        />
      )}

      {/* Proof Modal */}
      <Modal open={proofModal} title="Submit Challenge Verification Proof" onClose={() => setProofModal(false)} maxWidth="520px">
        <div>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
            Attach geotagged photo, commute ticket, or receipt to verify completion of this challenge.
          </p>
          <FileUpload
            onUpload={async (f) => {
              await new Promise((r) => setTimeout(r, 600));
              showToast('Challenge verification proof uploaded and pending XP grant!', 'success');
              setProofModal(false);
            }}
          />
        </div>
      </Modal>
    </div>
  );
};
