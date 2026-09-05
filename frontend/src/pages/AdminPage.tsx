import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminApi } from '../services/api';
import { useToast } from '../components/ui/Toast';
import { useAuth } from '../context/AuthContext';
import { 
  Users, 
  BookOpen, 
  MessageSquare, 
  Ban, 
  Trash2, 
  Edit3, 
  Search, 
  Sparkles,
  ShieldCheck,
  Calendar,
  X,
  Flag,
  Check
} from 'lucide-react';

interface AdminStats {
  totalUsers: number;
  totalStories: number;
  totalComments: number;
  blockedUsers: number;
}

export default function AdminPage() {
  const { user, loading: authLoading } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  // Redirect non-admin users — authLoading bitmeden yönlendirme yapma
  useEffect(() => {
    if (authLoading) return;
    if (!user || user.role !== 'ADMIN') {
      showToast('Bu sayfaya sadece yöneticiler erişebilir!', 'error');
      navigate('/');
    }
  }, [user, authLoading, navigate]);

  // authLoading bitmeden hiçbir şey render etme — early return KALDIRILDI (hooks kuralı)
  // Bunun yerine JSX içinde kontrol edeceğiz

  const [activeTab, setActiveTab] = useState<'users' | 'stories' | 'comments'>('users');
  const [loading, setLoading] = useState(true);
  
  // Data lists
  const [usersList, setUsersList] = useState<any[]>([]);
  const [storiesList, setStoriesList] = useState<any[]>([]);
  const [commentsList, setCommentsList] = useState<any[]>([]);
  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    totalStories: 0,
    totalComments: 0,
    blockedUsers: 0,
  });

  // Search filter query
  const [searchQuery, setSearchQuery] = useState('');

  // Editing state
  const [editingStory, setEditingStory] = useState<any | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editSummary, setEditSummary] = useState('');
  const [savingStory, setSavingStory] = useState(false);

  useEffect(() => {
    if (!authLoading && user?.role === 'ADMIN') {
      loadAllData();
    }
  }, [authLoading, user]);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [users, stories, comments] = await Promise.all([
        adminApi.getUsers(),
        adminApi.getStories(),
        adminApi.getComments()
      ]);

      setUsersList(users);
      setStoriesList(stories);
      setCommentsList(comments);

      const blockedCount = users.filter((u: any) => u.status === 'BLOCKED').length;
      setStats({
        totalUsers: users.length,
        totalStories: stories.length,
        totalComments: comments.length,
        blockedUsers: blockedCount,
      });
    } catch (err: any) {
      showToast('Veriler yüklenirken bir hata oluştu.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // ─── USER ACTIONS ────────────────────────────────────────────────
  const handleToggleBlock = async (id: string) => {
    try {
      const response = await adminApi.toggleBlockUser(id);
      setUsersList(prev => prev.map(u => u.id === id ? { ...u, status: response.user.status } : u));
      
      // Update stats
      const nextBlockedCount = usersList.map(u => u.id === id ? { ...u, status: response.user.status } : u)
        .filter((u: any) => u.status === 'BLOCKED').length;
      setStats(prev => ({ ...prev, blockedUsers: nextBlockedCount }));

      showToast(response.message || 'Kullanıcı durumu güncellendi.', 'success');
    } catch (err: any) {
      showToast(err.message || 'İşlem başarısız.', 'error');
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!window.confirm('Bu kullanıcıyı ve tüm masal/yorumlarını veritabanından tamamen silmek istediğinize emin misiniz?')) return;
    try {
      const response = await adminApi.deleteUser(id);
      setUsersList(prev => prev.filter(u => u.id !== id));
      showToast(response.message || 'Kullanıcı silindi.', 'success');
      loadAllData(); // Reload to sync counts
    } catch (err: any) {
      showToast(err.message || 'İşlem başarısız.', 'error');
    }
  };

  // ─── STORY ACTIONS ───────────────────────────────────────────────
  const handleDeleteStory = async (id: string) => {
    if (!window.confirm('Bu masalı silmek istediğinize emin misiniz?')) return;
    try {
      const response = await adminApi.deleteStory(id);
      setStoriesList(prev => prev.filter(s => s.id !== id));
      showToast(response.message || 'Masal silindi.', 'success');
      setStats(prev => ({ ...prev, totalStories: prev.totalStories - 1 }));
    } catch (err: any) {
      showToast(err.message || 'İşlem başarısız.', 'error');
    }
  };

  const handleOpenEditStory = (story: any) => {
    setEditingStory(story);
    setEditTitle(story.title || '');
    setEditContent(story.content || '');
    setEditSummary(story.summary || '');
  };

  const handleSaveStory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStory) return;
    
    setSavingStory(true);
    try {
      const updated = await adminApi.updateStory(editingStory.id, editTitle, editContent, editSummary);
      setStoriesList(prev => prev.map(s => s.id === editingStory.id ? { ...s, ...updated } : s));
      setEditingStory(null);
      showToast('Masal başarıyla güncellendi. ✨', 'success');
    } catch (err: any) {
      showToast(err.message || 'Masal güncellenemedi.', 'error');
    } finally {
      setSavingStory(false);
    }
  };

  // ─── COMMENT ACTIONS ─────────────────────────────────────────────
  const handleDeleteComment = async (id: string) => {
    if (!window.confirm('Bu yorumu kaldırmak istediğinize emin misiniz?')) return;
    try {
      const response = await adminApi.deleteComment(id);
      setCommentsList(prev => prev.filter(c => c.id !== id));
      showToast(response.message || 'Yorum silindi.', 'success');
      setStats(prev => ({ ...prev, totalComments: prev.totalComments - 1 }));
    } catch (err: any) {
      showToast(err.message || 'İşlem başarısız.', 'error');
    }
  };

  // ─── MODERATION ACTIONS ──────────────────────────────────────────
  const handleApproveStory = async (id: string) => {
    try {
      const response = await adminApi.approveStory(id);
      setStoriesList(prev => prev.map(s => s.id === id ? { ...s, reports: 0, moderationStatus: 'APPROVED' } : s));
      showToast(response.message || 'Masal onaylandı.', 'success');
    } catch (err: any) {
      showToast(err.message || 'İşlem başarısız.', 'error');
    }
  };

  const handleBlockStory = async (id: string) => {
    try {
      const response = await adminApi.blockStory(id);
      setStoriesList(prev => prev.map(s => s.id === id ? { ...s, moderationStatus: 'BLOCKED' } : s));
      showToast(response.message || 'Masal engellendi.', 'success');
    } catch (err: any) {
      showToast(err.message || 'İşlem başarısız.', 'error');
    }
  };

  const handleApproveComment = async (id: string) => {
    try {
      const response = await adminApi.approveComment(id);
      setCommentsList(prev => prev.map(c => c.id === id ? { ...c, reports: 0, status: 'APPROVED' } : c));
      showToast(response.message || 'Yorum onaylandı.', 'success');
    } catch (err: any) {
      showToast(err.message || 'İşlem başarısız.', 'error');
    }
  };

  const handleBlockComment = async (id: string) => {
    try {
      const response = await adminApi.blockComment(id);
      setCommentsList(prev => prev.map(c => c.id === id ? { ...c, status: 'BLOCKED' } : c));
      showToast(response.message || 'Yorum engellendi.', 'success');
    } catch (err: any) {
      showToast(err.message || 'İşlem başarısız.', 'error');
    }
  };

  // Filter lists based on search
  const filteredUsers = usersList.filter(u => 
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredStories = storiesList.filter(s => 
    (s.title || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
    (s.user?.name || s.user?.email || 'Gizemli Yazar').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredComments = commentsList.filter(c => 
    c.content.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (c.user?.name || c.user?.email || 'Anonim').toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Auth loading bitmeden bekle (hooks kuralı: early return yerine JSX içinde kontrol)
  if (authLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', flexDirection: 'column', gap: '16px' }}>
        <div style={{ width: '40px', height: '40px', border: '4px solid var(--border)', borderTopColor: '#2563eb', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Yetki kontrol ediliyor...</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="loading-page">
        <div className="loading-emoji">🛡️</div>
        <div className="loading-text">Yönetim Konsolu Yükleniyor...</div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
      {/* BAŞLIK */}
      <div className="library-header-bar" style={{ marginBottom: '32px' }}>
        <div>
          <h2 className="section-label" style={{ marginBottom: '8px' }}>🛡️ Yönetim Paneli</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '14.5px' }}>Masal Diyarı platformundaki tüm kullanıcıları, masalları ve yorumları bu panelden yönetebilirsiniz.</p>
        </div>
      </div>

      {/* İSTATİSTİKLER */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '32px' }}>
        <div style={{ background: 'var(--bg-card-solid)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '24px', display: 'flex', alignItems: 'center', gap: '20px', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ background: 'rgba(2, 132, 199, 0.08)', color: 'var(--primary)', width: '56px', height: '56px', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Users size={24} />
          </div>
          <div>
            <div style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-muted)' }}>Toplam Üye</div>
            <div style={{ fontSize: '28px', fontWeight: '800', color: 'var(--text-main)', marginTop: '4px' }}>{stats.totalUsers}</div>
          </div>
        </div>

        <div style={{ background: 'var(--bg-card-solid)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '24px', display: 'flex', alignItems: 'center', gap: '20px', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ background: 'rgba(249, 115, 22, 0.08)', color: 'var(--secondary)', width: '56px', height: '56px', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <BookOpen size={24} />
          </div>
          <div>
            <div style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-muted)' }}>Toplam Masal</div>
            <div style={{ fontSize: '28px', fontWeight: '800', color: 'var(--text-main)', marginTop: '4px' }}>{stats.totalStories}</div>
          </div>
        </div>

        <div style={{ background: 'var(--bg-card-solid)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '24px', display: 'flex', alignItems: 'center', gap: '20px', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ background: 'rgba(16, 185, 129, 0.08)', color: 'var(--success)', width: '56px', height: '56px', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <MessageSquare size={24} />
          </div>
          <div>
            <div style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-muted)' }}>Toplam Yorum</div>
            <div style={{ fontSize: '28px', fontWeight: '800', color: 'var(--text-main)', marginTop: '4px' }}>{stats.totalComments}</div>
          </div>
        </div>

        <div style={{ background: 'var(--bg-card-solid)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '24px', display: 'flex', alignItems: 'center', gap: '20px', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ background: 'rgba(239, 68, 68, 0.08)', color: 'var(--danger)', width: '56px', height: '56px', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Ban size={24} />
          </div>
          <div>
            <div style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-muted)' }}>Engelli Üye</div>
            <div style={{ fontSize: '28px', fontWeight: '800', color: 'var(--text-main)', marginTop: '4px' }}>{stats.blockedUsers}</div>
          </div>
        </div>
      </div>

      {/* ARAMA VE SEKMELER BARBARI */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-card-solid)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '16px 20px', marginBottom: '24px', boxShadow: 'var(--shadow-sm)' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            onClick={() => { setActiveTab('users'); setSearchQuery(''); }}
            className={`chip ${activeTab === 'users' ? 'active' : ''}`}
            style={{ padding: '10px 20px', background: activeTab === 'users' ? undefined : 'var(--bg-cosmic)' }}
          >
            <Users size={14} />
            <span>Üyeler ({filteredUsers.length})</span>
          </button>
          <button 
            onClick={() => { setActiveTab('stories'); setSearchQuery(''); }}
            className={`chip ${activeTab === 'stories' ? 'active' : ''}`}
            style={{ padding: '10px 20px', background: activeTab === 'stories' ? undefined : 'var(--bg-cosmic)' }}
          >
            <BookOpen size={14} />
            <span>Masallar ({filteredStories.length})</span>
          </button>
          <button 
            onClick={() => { setActiveTab('comments'); setSearchQuery(''); }}
            className={`chip ${activeTab === 'comments' ? 'active' : ''}`}
            style={{ padding: '10px 20px', background: activeTab === 'comments' ? undefined : 'var(--bg-cosmic)' }}
          >
            <MessageSquare size={14} />
            <span>Yorumlar ({filteredComments.length})</span>
          </button>
        </div>

        <div className="filter-search-wrapper" style={{ flex: '0 1 300px', margin: 0 }}>
          <Search className="filter-search-icon" size={16} />
          <input 
            type="text" 
            className="filter-search-input" 
            placeholder={
              activeTab === 'users' ? 'İsim veya e-posta ile ara...' :
              activeTab === 'stories' ? 'Başlık veya yazar ile ara...' : 'Yorum içeriği veya yazar ile ara...'
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ padding: '10px 14px 10px 38px', fontSize: '13.5px' }}
          />
        </div>
      </div>

      {/* İÇERİK ALANI */}
      <div style={{ background: 'var(--bg-card-solid)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-sm)', overflow: 'hidden' }}>
        
        {/* ÜYELER TABLOSU */}
        {activeTab === 'users' && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '700px' }}>
              <thead>
                <tr style={{ background: 'var(--bg-cosmic)', borderBottom: '1px solid var(--border)' }}>
                  <th style={{ padding: '16px 24px', fontSize: '13px', fontWeight: '800', color: 'var(--text-muted)' }}>Kullanıcı</th>
                  <th style={{ padding: '16px 24px', fontSize: '13px', fontWeight: '800', color: 'var(--text-muted)' }}>E-posta</th>
                  <th style={{ padding: '16px 24px', fontSize: '13px', fontWeight: '800', color: 'var(--text-muted)' }}>Rol</th>
                  <th style={{ padding: '16px 24px', fontSize: '13px', fontWeight: '800', color: 'var(--text-muted)' }}>Masal / Yorum</th>
                  <th style={{ padding: '16px 24px', fontSize: '13px', fontWeight: '800', color: 'var(--text-muted)' }}>Kayıt Tarihi</th>
                  <th style={{ padding: '16px 24px', fontSize: '13px', fontWeight: '800', color: 'var(--text-muted)', textAlign: 'right' }}>Aksiyonlar</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Kullanıcı bulunamadı.</td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => (
                    <tr key={u.id} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.2s' }}>
                      <td style={{ padding: '16px 24px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary), var(--secondary))', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '14px' }}>
                            {u.name.slice(0, 1).toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontWeight: '700', color: 'var(--text-main)' }}>{u.name}</div>
                            <div style={{ fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', borderRadius: '10px', marginTop: '3px', 
                              background: u.status === 'BLOCKED' ? 'rgba(239, 68, 68, 0.08)' : 'rgba(16, 185, 129, 0.08)',
                              color: u.status === 'BLOCKED' ? 'var(--danger)' : 'var(--success)'
                            }}>
                              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: u.status === 'BLOCKED' ? 'var(--danger)' : 'var(--success)' }}></span>
                              {u.status === 'BLOCKED' ? 'Engelli' : 'Aktif'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '16px 24px', color: 'var(--text-main)', fontSize: '14px' }}>{u.email}</td>
                      <td style={{ padding: '16px 24px' }}>
                        <span style={{ fontSize: '12px', fontWeight: '800', padding: '4px 10px', borderRadius: '12px', background: u.role === 'ADMIN' ? 'var(--secondary-glow)' : 'var(--bg-cosmic)', color: u.role === 'ADMIN' ? 'var(--secondary)' : 'var(--text-muted)' }}>
                          {u.role === 'ADMIN' ? '🛡️ Admin' : 'Kullanıcı'}
                        </span>
                      </td>
                      <td style={{ padding: '16px 24px', color: 'var(--text-muted)', fontSize: '13.5px' }}>
                        📖 {u.storiesCount} masal / 💬 {u.commentsCount} yorum
                      </td>
                      <td style={{ padding: '16px 24px', color: 'var(--text-muted)', fontSize: '13.5px' }}>
                        {new Date(u.createdAt).toLocaleDateString('tr-TR')}
                      </td>
                      <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                        {u.role !== 'ADMIN' && (
                          <div style={{ display: 'inline-flex', gap: '8px' }}>
                            <button 
                              onClick={() => handleToggleBlock(u.id)}
                              className={`reaction-btn ${u.status === 'BLOCKED' ? 'liked' : ''}`}
                              title={u.status === 'BLOCKED' ? 'Engeli Kaldır' : 'Kullanıcıyı Engelle'}
                              style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', border: '1px solid var(--border)', background: 'none', borderRadius: '8px', cursor: 'pointer' }}
                            >
                              <Ban size={14} style={{ color: u.status === 'BLOCKED' ? 'var(--success)' : 'var(--danger)' }} />
                            </button>
                            <button 
                              onClick={() => handleDeleteUser(u.id)}
                              title="Kullanıcıyı Sil"
                              style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', border: '1px solid var(--border)', background: 'none', borderRadius: '8px', cursor: 'pointer' }}
                              onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--danger)'}
                              onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
                            >
                              <Trash2 size={14} style={{ color: 'var(--danger)' }} />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* MASALLAR TABLOSU */}
        {activeTab === 'stories' && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '700px' }}>
              <thead>
                <tr style={{ background: 'var(--bg-cosmic)', borderBottom: '1px solid var(--border)' }}>
                  <th style={{ padding: '16px 24px', fontSize: '13px', fontWeight: '800', color: 'var(--text-muted)' }}>Masal Başlığı</th>
                  <th style={{ padding: '16px 24px', fontSize: '13px', fontWeight: '800', color: 'var(--text-muted)' }}>Yazar</th>
                  <th style={{ padding: '16px 24px', fontSize: '13px', fontWeight: '800', color: 'var(--text-muted)' }}>Oluşturulma</th>
                  <th style={{ padding: '16px 24px', fontSize: '13px', fontWeight: '800', color: 'var(--text-muted)' }}>İstatistikler</th>
                  <th style={{ padding: '16px 24px', fontSize: '13px', fontWeight: '800', color: 'var(--text-muted)' }}>Moderatör / Şikayet</th>
                  <th style={{ padding: '16px 24px', fontSize: '13px', fontWeight: '800', color: 'var(--text-muted)', textAlign: 'right' }}>Aksiyonlar</th>
                </tr>
              </thead>
              <tbody>
                {filteredStories.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Masal bulunamadı.</td>
                  </tr>
                ) : (
                  filteredStories.map((s) => (
                    <tr key={s.id} style={{ 
                      borderBottom: '1px solid var(--border)',
                      background: s.moderationStatus === 'BLOCKED' ? 'rgba(239, 68, 68, 0.03)' : (s.reports > 0 ? 'rgba(245, 158, 11, 0.03)' : 'none')
                    }}>
                      <td style={{ padding: '16px 24px' }}>
                        <div style={{ fontWeight: '700', color: 'var(--text-main)', fontSize: '14.5px' }}>{s.title || 'Başlıksız Masal'}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>ID: {s.id}</div>
                      </td>
                      <td style={{ padding: '16px 24px' }}>
                        <div style={{ fontWeight: '600', color: 'var(--text-main)', fontSize: '14px' }}>{s.user?.name || 'Gizemli Yazar'}</div>
                        <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>{s.user?.email || 'Anonim'}</div>
                      </td>
                      <td style={{ padding: '16px 24px', color: 'var(--text-muted)', fontSize: '13.5px' }}>
                        {new Date(s.createdAt).toLocaleDateString('tr-TR')}
                      </td>
                      <td style={{ padding: '16px 24px', color: 'var(--text-muted)', fontSize: '13px' }}>
                        👁️ {s.views} / ❤️ {(s.likes || 0) + (s.likesThumbsUp || 0) + (s.likesStars || 0)} / 💬 {s.commentsCount}
                      </td>
                      <td style={{ padding: '16px 24px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <span style={{ fontSize: '11px', fontWeight: '700', padding: '2px 8px', borderRadius: '6px', width: 'fit-content',
                            background: s.status === 'COMPLETED' ? 'rgba(16, 185, 129, 0.08)' : 'rgba(249, 115, 22, 0.08)',
                            color: s.status === 'COMPLETED' ? 'var(--success)' : 'var(--secondary)'
                          }}>
                            Süreç: {s.status}
                          </span>
                          {s.reports > 0 && (
                            <span style={{ fontSize: '11px', fontWeight: '700', padding: '2px 8px', borderRadius: '6px', width: 'fit-content',
                              background: 'rgba(239, 68, 68, 0.08)', color: 'var(--danger)'
                            }}>
                              🚨 Şikayet: {s.reports}
                            </span>
                          )}
                          <span style={{ fontSize: '11px', fontWeight: '700', padding: '2px 8px', borderRadius: '6px', width: 'fit-content',
                            background: s.moderationStatus === 'BLOCKED' ? 'rgba(239, 68, 68, 0.15)' : (s.moderationStatus === 'REPORTED' ? 'rgba(245, 158, 11, 0.12)' : 'rgba(16, 185, 129, 0.08)'),
                            color: s.moderationStatus === 'BLOCKED' ? 'var(--danger)' : (s.moderationStatus === 'REPORTED' ? 'var(--warning)' : 'var(--success)')
                          }}>
                            Mod: {s.moderationStatus || 'APPROVED'}
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '8px' }}>
                          {(s.reports > 0 || s.moderationStatus !== 'APPROVED') && (
                            <>
                              <button 
                                onClick={() => handleApproveStory(s.id)}
                                title="Onayla (Sıkıntı Yok)"
                                style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', border: '1px solid #10b981', background: 'rgba(16, 185, 129, 0.05)', borderRadius: '8px', cursor: 'pointer' }}
                              >
                                <ShieldCheck size={14} style={{ color: '#10b981' }} />
                              </button>
                              <button 
                                onClick={() => handleBlockStory(s.id)}
                                title="Engelle (Yasakla)"
                                style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', border: '1px solid var(--danger)', background: 'rgba(239, 68, 68, 0.05)', borderRadius: '8px', cursor: 'pointer' }}
                              >
                                <Ban size={14} style={{ color: 'var(--danger)' }} />
                              </button>
                            </>
                          )}
                          <button 
                            onClick={() => handleOpenEditStory(s)}
                            title="Düzenle"
                            style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', border: '1px solid var(--border)', background: 'none', borderRadius: '8px', cursor: 'pointer' }}
                            onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--primary)'}
                            onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
                          >
                            <Edit3 size={14} style={{ color: 'var(--primary)' }} />
                          </button>
                          <button 
                            onClick={() => handleDeleteStory(s.id)}
                            title="Masalı Sil"
                            style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', border: '1px solid var(--border)', background: 'none', borderRadius: '8px', cursor: 'pointer' }}
                            onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--danger)'}
                            onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
                          >
                            <Trash2 size={14} style={{ color: 'var(--danger)' }} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* YORUMLAR TABLOSU */}
        {activeTab === 'comments' && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '700px' }}>
              <thead>
                <tr style={{ background: 'var(--bg-cosmic)', borderBottom: '1px solid var(--border)' }}>
                  <th style={{ padding: '16px 24px', fontSize: '13px', fontWeight: '800', color: 'var(--text-muted)' }}>Yazılan Yorum</th>
                  <th style={{ padding: '16px 24px', fontSize: '13px', fontWeight: '800', color: 'var(--text-muted)' }}>Yazar</th>
                  <th style={{ padding: '16px 24px', fontSize: '13px', fontWeight: '800', color: 'var(--text-muted)' }}>Ait Olduğu Masal</th>
                  <th style={{ padding: '16px 24px', fontSize: '13px', fontWeight: '800', color: 'var(--text-muted)' }}>Moderatör / Şikayet</th>
                  <th style={{ padding: '16px 24px', fontSize: '13px', fontWeight: '800', color: 'var(--text-muted)', textAlign: 'right' }}>Aksiyonlar</th>
                </tr>
              </thead>
              <tbody>
                {filteredComments.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Yorum bulunamadı.</td>
                  </tr>
                ) : (
                  filteredComments.map((c) => (
                    <tr key={c.id} style={{ 
                      borderBottom: '1px solid var(--border)',
                      background: c.status === 'BLOCKED' ? 'rgba(239, 68, 68, 0.03)' : (c.reports > 0 ? 'rgba(245, 158, 11, 0.03)' : 'none')
                    }}>
                      <td style={{ padding: '16px 24px', color: 'var(--text-main)', fontSize: '14px', maxWidth: '300px' }}>
                        "{c.content}"
                      </td>
                      <td style={{ padding: '16px 24px' }}>
                        <div style={{ fontWeight: '600', color: 'var(--text-main)', fontSize: '13.5px' }}>{c.user?.name || 'Gizemli Yazar'}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{c.user?.email || 'Anonim'}</div>
                      </td>
                      <td style={{ padding: '16px 24px', color: 'var(--primary)', fontWeight: '600', fontSize: '13.5px' }}>
                        {c.story?.title || 'Silinmiş Masal'}
                      </td>
                      <td style={{ padding: '16px 24px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          {c.reports > 0 && (
                            <span style={{ fontSize: '11px', fontWeight: '700', padding: '2px 8px', borderRadius: '6px', width: 'fit-content',
                              background: 'rgba(239, 68, 68, 0.08)', color: 'var(--danger)'
                            }}>
                              🚨 Şikayet: {c.reports}
                            </span>
                          )}
                          <span style={{ fontSize: '11px', fontWeight: '700', padding: '2px 8px', borderRadius: '6px', width: 'fit-content',
                            background: c.status === 'BLOCKED' ? 'rgba(239, 68, 68, 0.15)' : (c.status === 'REPORTED' ? 'rgba(245, 158, 11, 0.12)' : 'rgba(16, 185, 129, 0.08)'),
                            color: c.status === 'BLOCKED' ? 'var(--danger)' : (c.status === 'REPORTED' ? 'var(--warning)' : 'var(--success)')
                          }}>
                            Mod: {c.status || 'APPROVED'}
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '8px' }}>
                          {(c.reports > 0 || c.status !== 'APPROVED') && (
                            <>
                              <button 
                                onClick={() => handleApproveComment(c.id)}
                                title="Onayla (Sıkıntı Yok)"
                                style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', border: '1px solid #10b981', background: 'rgba(16, 185, 129, 0.05)', borderRadius: '8px', cursor: 'pointer' }}
                              >
                                <ShieldCheck size={14} style={{ color: '#10b981' }} />
                              </button>
                              <button 
                                onClick={() => handleBlockComment(c.id)}
                                title="Engelle (Yasakla)"
                                style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', border: '1px solid var(--danger)', background: 'rgba(239, 68, 68, 0.05)', borderRadius: '8px', cursor: 'pointer' }}
                              >
                                <Ban size={14} style={{ color: 'var(--danger)' }} />
                              </button>
                            </>
                          )}
                          <button 
                            onClick={() => handleDeleteComment(c.id)}
                            title="Yorumu Sil"
                            style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', border: '1px solid var(--border)', background: 'none', borderRadius: '8px', cursor: 'pointer' }}
                            onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--danger)'}
                            onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
                          >
                            <Trash2 size={14} style={{ color: 'var(--danger)' }} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

      </div>

      {/* MASAL DÜZENLEME MODAL */}
      {editingStory && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', zIndex: 110 }}>
          <div className="feedback-form-card" style={{ maxWidth: '640px', width: '100%', background: 'var(--bg-card-solid)', borderRadius: 'var(--radius-lg)', padding: '30px', boxShadow: 'var(--shadow-lg)', position: 'relative' }}>
            <button 
              onClick={() => setEditingStory(null)}
              style={{ position: 'absolute', right: '20px', top: '20px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
            >
              <X size={20} />
            </button>

            <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '22px', fontWeight: '800', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Edit3 size={20} style={{ color: 'var(--primary)' }} />
              <span>Masalı Düzenle</span>
            </h3>

            <form onSubmit={handleSaveStory}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '800', color: 'var(--text-muted)', marginBottom: '6px' }}>Başlık</label>
                <input 
                  type="text" 
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  required
                  style={{ width: '100%', padding: '12px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', outline: 'none' }}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '800', color: 'var(--text-muted)', marginBottom: '6px' }}>Özet (Kısa Hikaye Bilgisi)</label>
                <input 
                  type="text" 
                  value={editSummary}
                  onChange={(e) => setEditSummary(e.target.value)}
                  style={{ width: '100%', padding: '12px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', outline: 'none' }}
                />
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '800', color: 'var(--text-muted)', marginBottom: '6px' }}>Masal İçeriği</label>
                <textarea 
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  required
                  rows={8}
                  style={{ width: '100%', padding: '12px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', outline: 'none', resize: 'vertical', fontSize: '14px', lineHeight: '1.6' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button 
                  type="button" 
                  className="chip"
                  onClick={() => setEditingStory(null)}
                  style={{ padding: '10px 20px', background: 'var(--bg-cosmic)' }}
                >
                  Vazgeç
                </button>
                <button 
                  type="submit" 
                  className="cta-btn" 
                  disabled={savingStory}
                  style={{ maxWidth: '160px', padding: '10px 20px' }}
                >
                  <span>{savingStory ? 'Kaydediliyor...' : 'Kaydet ✨'}</span>
                </button>
              </div>
            </form>

          </div>
        </div>
      )}
    </div>
  );
}
