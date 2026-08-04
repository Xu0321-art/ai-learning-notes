const STORAGE_KEY = 'ai-learning-notes-notes-v2';

function getNotes() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error('读取笔记失败', e);
    return [];
  }
}

function saveNotes(notes) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
    updateStats();
  } catch (e) {
    console.error('保存笔记失败', e);
  }
}

function addNote(note) {
  const notes = getNotes();
  notes.unshift({ ...note, id: Date.now() });
  saveNotes(notes);
  renderNotes();
  animateCardEntry();
}

function deleteNote(id) {
  let notes = getNotes();
  const note = notes.find(n => n.id === id);
  if (note) {
    if (confirm('确定要删除这条笔记吗？\n\n"' + note.title + '"')) {
      notes = notes.filter(n => n.id !== id);
      saveNotes(notes);
      renderNotes();
    }
  }
}

function updateStats() {
  const notes = getNotes();
  const countEl = document.getElementById('stat-count');
  const streakEl = document.getElementById('stat-streak');
  const filterCountEl = document.getElementById('filter-count');
  
  if (countEl) countEl.textContent = notes.length;
  if (streakEl) streakEl.textContent = calculateStreak(notes) + '天';
  if (filterCountEl) updateFilterCount(filterCountEl, notes, 'all');
}

function calculateStreak(notes) {
  if (notes.length === 0) return 0;
  
  const uniqueDates = [...new Set(notes.map(n => n.date))].sort().reverse();
  if (uniqueDates.length === 0) return 0;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
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

function updateFilterCount(el, notes, filter) {
  const filtered = filter === 'all' 
    ? notes 
    : notes.filter(n => n.category === filter);
  el.textContent = `(${filtered.length})`;
}

function renderNotes(filter = 'all') {
  const container = document.getElementById('notes-container');
  const filterCountEl = document.getElementById('filter-count');
  
  if (!container || !filterCountEl) return;
  
  const notes = getNotes();
  const filtered = filter === 'all' 
    ? notes 
    : notes.filter(n => n.category === filter);
  
  updateFilterCount(filterCountEl, notes, filter);
  
  if (filtered.length === 0) {
    const empty = filter === 'all' 
      ? '<p class="empty-state">还没有笔记，快去添加第一条吧！🚀</p>'
      : `<p class="empty-state">这个分类下还没有笔记，试试其他分类吧！</p>`;
    container.innerHTML = empty;
    return;
  }
  
  container.innerHTML = filtered.map(note => {
    const attachmentsHtml = note.attachments && note.attachments.length > 0
      ? `
        <div class="note-attachments">
          <div style="font-size:0.85rem;color:#64748b;margin-bottom:8px;">📎 附件 (${note.attachments.length})</div>
          ${note.attachments.map(att => `
            <div class="note-attachment">
              ${att.type.startsWith('image/') ? 
                `<img src="${att.data}" alt="${att.name}" onerror="this.style.display='none'">` : 
                `<span>📄</span>`
              }
              <span>${att.name}</span>
              ${att.type.startsWith('image/') ? '' : `<a href="${att.url}" target="_blank" download>下载</a>`}
            </div>
          `).join('')}
        </div>
      ` : '';
    
    return `
      <div class="note-card">
        <div class="note-actions">
          <button class="btn-delete" onclick="deleteNote(${note.id})" title="删除笔记">🗑️</button>
        </div>
        <div class="note-header">
          <span class="note-date">📅 ${note.date}</span>
          <span class="note-category">${note.category}</span>
        </div>
        <h3 class="note-title">${escapeHtml(note.title)}</h3>
        <p class="note-content">${escapeHtml(note.content)}</p>
        ${attachmentsHtml}
      </div>
    `;
  }).join('');
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function animateCardEntry() {
  const cards = document.querySelectorAll('.note-card');
  cards.forEach((card, index) => {
    card.style.animationDelay = `${index * 50}ms`;
  });
}

// ========== 文件上传管理 ==========
let selectedFiles = [];

document.getElementById('file-input').addEventListener('change', (e) => {
  const files = Array.from(e.target.files);
  selectedFiles = [...selectedFiles, ...files];
  updateFileList();
});

function updateFileList() {
  const fileListEl = document.getElementById('file-list');
  if (!fileListEl || selectedFiles.length === 0) {
    fileListEl.innerHTML = '';
    return;
  }
  
  fileListEl.innerHTML = selectedFiles.map((file, index) => {
    const icon = file.type.startsWith('image/') ? '🖼️' : 
                 file.type.includes('word') || file.name.endsWith('.docx') ? '📄' :
                 file.type.includes('pdf') ? '📕' : '📎';
    return `
      <div class="file-item">
        <span>${icon}</span>
        <span title="${file.name}">${file.name}</span>
        <span class="file-remove" onclick="removeFile(${index})" title="移除">✕</span>
      </div>
    `;
  }).join('');
}

function removeFile(index) {
  selectedFiles.splice(index, 1);
  updateFileList();
}

// 将文件转为 Base64（图片）或保留 URL（其他文件）
async function processAttachments(files) {
  const attachments = [];
  
  for (const file of files) {
    const reader = new FileReader();
    
    await new Promise((resolve) => {
      reader.onload = (e) => {
        const isImage = file.type.startsWith('image/');
        attachments.push({
          name: file.name,
          type: file.type,
          size: file.size,
          data: isImage ? e.target.result : null,
          url: isImage ? e.target.result : file.name // 相对路径，用于下载
        });
        resolve();
      };
      reader.readAsDataURL(file);
    });
  }
  
  return attachments;
}

// Toast 提示
function showToast(message, type = 'success') {
  const colors = {
    success: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    info: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
    warning: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
  };
  
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  toast.style.cssText = `
    position: fixed;
    bottom: 30px;
    left: 50%;
    transform: translateX(-50%) translateY(100px);
    background: ${colors[type] || colors.success};
    color: white;
    padding: 14px 28px;
    border-radius: 12px;
    font-size: 1rem;
    font-weight: 500;
    z-index: 10000;
    box-shadow: 0 10px 30px rgba(0,0,0,0.3);
    animation: slideUpToast 0.3s ease-out forwards;
  `;
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.style.animation = 'fadeOutToast 0.3s ease-out forwards';
    setTimeout(() => toast.remove(), 300);
  }, 2500);
}

// 添加 Toast 动画样式
const toastStyle = document.createElement('style');
toastStyle.textContent = `
  @keyframes slideUpToast { to { transform: translateX(-50%) translateY(0); } }
  @keyframes fadeOutToast { to { opacity: 0; transform: translateX(-50%) translateY(20px); } }
`;
document.head.appendChild(toastStyle);

// 初始化
document.addEventListener('DOMContentLoaded', () => {
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('note-date').value = today;
  
  renderNotes();
  updateStats();
  
  document.getElementById('note-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const note = {
      date: document.getElementById('note-date').value,
      title: document.getElementById('note-title').value.trim(),
      category: document.getElementById('note-category').value,
      content: document.getElementById('note-content').value.trim(),
      attachments: []
    };
    
    if (note.title && note.content) {
      if (selectedFiles.length > 0) {
        const processBtn = document.querySelector('.btn-primary');
        const originalText = processBtn.textContent;
        processBtn.textContent = '⏳ 处理文件...';
        processBtn.disabled = true;
        
        try {
          note.attachments = await processAttachments(selectedFiles);
        } catch (err) {
          showToast('文件处理失败，请重试', 'warning');
          processBtn.textContent = originalText;
          processBtn.disabled = false;
          return;
        }
        
        processBtn.textContent = originalText;
        processBtn.disabled = false;
      }
      
      addNote(note);
      e.target.reset();
      document.getElementById('note-date').value = today;
      selectedFiles = [];
      updateFileList();
      showToast('✨ 笔记已保存成功！', 'success');
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

// 全局暴露给按钮调用
window.deleteNote = deleteNote;
window.removeFile = (index) => {
  selectedFiles.splice(index, 1);
  updateFileList();
};
