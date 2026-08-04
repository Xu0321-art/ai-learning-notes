// 笔记数据管理
const STORAGE_KEY = 'ai-learning-notes';

function getNotes() {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
}

function saveNotes(notes) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
  updateStats();
}

function addNote(note) {
  const notes = getNotes();
  notes.unshift({ ...note, id: Date.now() });
  saveNotes(notes);
  renderNotes();
}

function deleteNote(id) {
  let notes = getNotes();
  notes = notes.filter(n => n.id !== id);
  saveNotes(notes);
  renderNotes();
}

function updateStats() {
  const notes = getNotes();
  const countEl = document.getElementById('stat-count');
  const streakEl = document.getElementById('stat-streak');
  
  countEl.textContent = '已记录 ' + notes.length + ' 条笔记';
  
  const streak = calculateStreak(notes);
  streakEl.textContent = '连续学习 ' + streak + ' 天';
}

function calculateStreak(notes) {
  if (notes.length === 0) return 0;
  
  const uniqueDates = [...new Set(notes.map(n => n.date))].sort().reverse();
  if (uniqueDates.length === 0) return 0;
  
  const today = new Date();
  today.setHours(0,0,0,0);
  const todayStr = today.toISOString().split('T')[0];
  
  let streak = 0;
  let checkDate = new Date(today);
  
  for (const dateStr of uniqueDates) {
    if (dateStr === todayStr || dateStr === formatDate(checkDate)) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else if (dateStr < formatDate(checkDate)) {
      break;
    }
  }
  
  return streak;
}

function formatDate(date) {
  return date.toISOString().split('T')[0];
}

function renderNotes(filter = 'all') {
  const container = document.getElementById('notes-container');
  const notes = getNotes();
  
  const filtered = filter === 'all' 
    ? notes 
    : notes.filter(n => n.category === filter);
  
  if (filtered.length === 0) {
    container.innerHTML = '<p class="empty-state">还没有笔记，快去添加第一条吧！🚀</p>';
    return;
  }
  
  container.innerHTML = filtered.map(note => `
    <div class="note-card">
      <div class="note-actions">
        <button class="btn-delete" onclick="deleteNote(${note.id})" title="删除">🗑️</button>
      </div>
      <div class="note-header">
        <span class="note-date">📅 ${note.date}</span>
        <span class="note-category">${note.category}</span>
      </div>
      <h3 class="note-title">${escapeHtml(note.title)}</h3>
      <p class="note-content">${escapeHtml(note.content)}</p>
    </div>
  `).join('');
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

document.addEventListener('DOMContentLoaded', () => {
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('note-date').value = today;
  
  renderNotes();
  updateStats();
  
  document.getElementById('note-form').addEventListener('submit', (e) => {
    e.preventDefault();
    
    const note = {
      date: document.getElementById('note-date').value,
      title: document.getElementById('note-title').value.trim(),
      category: document.getElementById('note-category').value,
      content: document.getElementById('note-content').value.trim()
    };
    
    if (note.title && note.content) {
      addNote(note);
      e.target.reset();
      document.getElementById('note-date').value = today;
      showToast('笔记已保存！✨');
    }
  });
  
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderNotes(btn.dataset.filter);
    });
  });
});

function showToast(message) {
  const toast = document.createElement('div');
  toast.textContent = message;
  toast.style.cssText = `
    position: fixed;
    bottom: 30px;
    left: 50%;
    transform: translateX(-50%);
    background: var(--accent);
    color: white;
    padding: 12px 24px;
    border-radius: 10px;
    font-size: 0.95rem;
    z-index: 1000;
    animation: fadeInUp 0.3s ease;
  `;
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s';
    setTimeout(() => toast.remove(), 300);
  }, 2000);
}

const style = document.createElement('style');
style.textContent = `
  @keyframes fadeInUp {
    from { opacity: 0; transform: translate(-50%, 20px); }
    to { opacity: 1; transform: translate(-50%, 0); }
  }
`;
document.head.appendChild(style);
