/* ============================================================================
   FILES.JS — Files Vault & Cloud Storage Management
   ============================================================================ */

(function () {
  'use strict';

  const $ = id => document.getElementById(id);
  const esc = s => String(s || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  const STORAGE_KEY = 'nexus_files_vault';

  let files = [];
  let currentCategory = 'all';
  let searchQuery = '';
  let currentSort = 'date-desc';
  let viewMode = 'grid';

  const ICONS = {
    document: '📄',
    image:    '🖼️',
    code:     '💻',
    archive:  '📦',
    other:    '📁'
  };

  function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  function getStoredFiles() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {}

    const now = new Date();
    const dStr = now.toISOString().split('T')[0];

    const defaults = [
      {
        id: 'file-1',
        name: 'Nexus_Architecture_Overview.pdf',
        size: 1450000,
        type: 'application/pdf',
        category: 'document',
        date: dStr,
        content: null
      },
      {
        id: 'file-2',
        name: 'System_Dashboard_Mockup.png',
        size: 840000,
        type: 'image/png',
        category: 'image',
        date: dStr,
        content: null
      },
      {
        id: 'file-3',
        name: 'database_schema_v2.json',
        size: 45000,
        type: 'application/json',
        category: 'code',
        date: dStr,
        content: '{\n  "version": "2.1.0",\n  "database": "nexus_production",\n  "collections": ["users", "tasks", "notes", "rooms"]\n}'
      },
      {
        id: 'file-4',
        name: 'Workspace_Assets_Archive.zip',
        size: 3800000,
        type: 'application/zip',
        category: 'archive',
        date: dStr,
        content: null
      },
      {
        id: 'file-5',
        name: 'Sprint_Planning_Notes.docx',
        size: 512000,
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        category: 'document',
        date: dStr,
        content: null
      }
    ];

    saveFiles(defaults);
    return defaults;
  }

  function saveFiles(list) {
    files = list;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(files));
    } catch (e) {}
  }

  function detectCategory(filename, mimeType = '') {
    const ext = filename.split('.').pop().toLowerCase();
    if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'].includes(ext) || mimeType.startsWith('image/')) return 'image';
    if (['pdf', 'doc', 'docx', 'txt', 'rtf', 'md', 'xls', 'xlsx', 'csv'].includes(ext)) return 'document';
    if (['js', 'ts', 'jsx', 'tsx', 'html', 'css', 'json', 'py', 'java', 'cpp', 'c', 'sql'].includes(ext)) return 'code';
    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return 'archive';
    return 'other';
  }

  /* ---------- Render Functions ---------- */
  function renderFiles() {
    const container = $('filesContainer');
    if (!container) return;

    // Filter
    let list = files.filter(f => {
      if (currentCategory !== 'all' && f.category !== currentCategory) return false;
      if (searchQuery && !f.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    });

    // Sort
    list.sort((a, b) => {
      if (currentSort === 'name-asc') return a.name.localeCompare(b.name);
      if (currentSort === 'size-desc') return b.size - a.size;
      return (b.date || '').localeCompare(a.date || '');
    });

    updateStats();

    if (list.length === 0) {
      container.className = 'col-span-full';
      container.innerHTML = `
        <div class="text-center py-16 text-slate-500">
          <p class="text-3xl mb-2">📁</p>
          <p class="text-sm font-semibold text-slate-400">No files found</p>
          <p class="text-xs text-slate-500 mt-1">Upload files using the button above or drag & drop.</p>
        </div>
      `;
      return;
    }

    if (viewMode === 'grid') {
      container.className = 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4';
      container.innerHTML = list.map(f => {
        const icon = ICONS[f.category] || ICONS.other;
        return `
          <div class="nx-card p-4 file-card cursor-pointer group flex flex-col justify-between" onclick="openFilePreview('${f.id}')">
            <div class="flex items-start justify-between mb-3">
              <div class="w-11 h-11 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-xl group-hover:scale-105 transition-all">
                ${icon}
              </div>
              <button onclick="event.stopPropagation(); deleteFile('${f.id}')" class="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-white/[0.06] transition-all" title="Delete file">
                <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
              </button>
            </div>

            <div>
              <p class="text-xs font-bold text-white truncate mb-1" title="${esc(f.name)}">${esc(f.name)}</p>
              <div class="flex items-center justify-between text-[11px] text-slate-400">
                <span>${formatBytes(f.size)}</span>
                <span class="capitalize text-cyan-400 text-[10px] font-semibold">${esc(f.category)}</span>
              </div>
            </div>

            <div class="mt-3 pt-2.5 border-t border-white/[0.04] flex items-center justify-between text-[10px] text-slate-500">
              <span>${esc(f.date || 'Today')}</span>
              <span class="text-cyan-400 hover:underline">View ↗</span>
            </div>
          </div>
        `;
      }).join('');
    } else {
      // List View
      container.className = 'space-y-2';
      container.innerHTML = `
        <div class="nx-card overflow-hidden">
          <table class="w-full text-left text-xs">
            <thead class="border-b border-white/[0.06] text-slate-400 uppercase tracking-wider text-[10px] bg-white/[0.02]">
              <tr>
                <th class="p-3">File Name</th>
                <th class="p-3 hidden sm:table-cell">Type</th>
                <th class="p-3">Size</th>
                <th class="p-3 hidden md:table-cell">Date</th>
                <th class="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-white/[0.04]">
              ${list.map(f => {
                const icon = ICONS[f.category] || ICONS.other;
                return `
                  <tr class="hover:bg-white/[0.02] cursor-pointer transition-all" onclick="openFilePreview('${f.id}')">
                    <td class="p-3 font-semibold text-white flex items-center gap-2.5">
                      <span class="text-base">${icon}</span>
                      <span class="truncate max-w-[220px] sm:max-w-xs">${esc(f.name)}</span>
                    </td>
                    <td class="p-3 text-slate-400 capitalize hidden sm:table-cell">${esc(f.category)}</td>
                    <td class="p-3 text-slate-300">${formatBytes(f.size)}</td>
                    <td class="p-3 text-slate-500 hidden md:table-cell">${esc(f.date || '-')}</td>
                    <td class="p-3 text-right" onclick="event.stopPropagation()">
                      <button onclick="downloadFile('${f.id}')" class="p-1.5 text-slate-400 hover:text-cyan-400 transition-all mr-1" title="Download">
                        <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                      </button>
                      <button onclick="deleteFile('${f.id}')" class="p-1.5 text-slate-400 hover:text-red-400 transition-all" title="Delete">
                        <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                      </button>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      `;
    }
  }

  function updateStats() {
    let totalBytes = 0;
    let docs = 0, docBytes = 0;
    let media = 0, mediaBytes = 0;
    let code = 0, codeBytes = 0;

    files.forEach(f => {
      totalBytes += f.size || 0;
      if (f.category === 'document') { docs++; docBytes += f.size || 0; }
      else if (f.category === 'image') { media++; mediaBytes += f.size || 0; }
      else if (f.category === 'code' || f.category === 'archive') { code++; codeBytes += f.size || 0; }
    });

    if ($('storageUsedText')) $('storageUsedText').textContent = formatBytes(totalBytes);
    if ($('docCountText')) $('docCountText').textContent = `${docs} file${docs === 1 ? '' : 's'}`;
    if ($('docSizeText')) $('docSizeText').textContent = formatBytes(docBytes);
    if ($('mediaCountText')) $('mediaCountText').textContent = `${media} file${media === 1 ? '' : 's'}`;
    if ($('mediaSizeText')) $('mediaSizeText').textContent = formatBytes(mediaBytes);
    if ($('codeCountText')) $('codeCountText').textContent = `${code} file${code === 1 ? '' : 's'}`;
    if ($('codeSizeText')) $('codeSizeText').textContent = formatBytes(codeBytes);

    if ($('storageBar')) {
      const pct = Math.min(100, Math.max(2, (totalBytes / (15 * 1024 * 1024 * 1024)) * 100));
      $('storageBar').style.width = pct.toFixed(1) + '%';
    }
  }

  /* File Handlers */
  window.handleFileSelect = function (e) {
    const selected = Array.from(e.target.files || []);
    if (!selected.length) return;
    processUploadedFiles(selected);
    e.target.value = '';
  };

  window.handleDragOver = function (e) {
    e.preventDefault();
    $('dropZone')?.classList.add('border-cyan-400', 'bg-cyan-500/[0.05]');
  };

  window.handleDragLeave = function (e) {
    e.preventDefault();
    $('dropZone')?.classList.remove('border-cyan-400', 'bg-cyan-500/[0.05]');
  };

  window.handleDrop = function (e) {
    e.preventDefault();
    $('dropZone')?.classList.remove('border-cyan-400', 'bg-cyan-500/[0.05]');
    const dropped = Array.from(e.dataTransfer.files || []);
    if (dropped.length) processUploadedFiles(dropped);
  };

  function processUploadedFiles(fileList) {
    const dStr = new Date().toISOString().split('T')[0];

    fileList.forEach(file => {
      const reader = new FileReader();
      const cat = detectCategory(file.name, file.type);

      reader.onload = function (evt) {
        files.unshift({
          id: 'file-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
          name: file.name,
          size: file.size,
          type: file.type || 'application/octet-stream',
          category: cat,
          date: dStr,
          content: evt.target.result // base64 or text data
        });
        saveFiles(files);
        renderFiles();
      };

      if (cat === 'image') {
        reader.readAsDataURL(file);
      } else if (file.size < 500000 && (cat === 'code' || cat === 'document')) {
        reader.readAsText(file);
      } else {
        reader.readAsDataURL(file);
      }
    });
  }

  window.filterFiles = function (cat) {
    currentCategory = cat;
    document.querySelectorAll('.file-cat-btn').forEach(btn => {
      const match = btn.getAttribute('data-cat') === cat;
      btn.classList.toggle('bg-cyan-500/20', match);
      btn.classList.toggle('text-cyan-300', match);
      btn.classList.toggle('text-slate-400', !match);
    });
    renderFiles();
  };

  window.searchFiles = function (query) {
    searchQuery = query;
    renderFiles();
  };

  window.sortFiles = function (val) {
    currentSort = val;
    renderFiles();
  };

  window.setViewMode = function (mode) {
    viewMode = mode;
    $('viewGridBtn')?.classList.toggle('bg-cyan-500/20', mode === 'grid');
    $('viewGridBtn')?.classList.toggle('text-cyan-300', mode === 'grid');
    $('viewGridBtn')?.classList.toggle('text-slate-400', mode !== 'grid');

    $('viewListBtn')?.classList.toggle('bg-cyan-500/20', mode === 'list');
    $('viewListBtn')?.classList.toggle('text-cyan-300', mode === 'list');
    $('viewListBtn')?.classList.toggle('text-slate-400', mode !== 'list');

    renderFiles();
  };

  window.deleteFile = function (id) {
    if (!confirm('Are you sure you want to delete this file?')) return;
    files = files.filter(f => f.id !== id);
    saveFiles(files);
    renderFiles();
    closeFileModal();
  };

  window.openFilePreview = function (id) {
    const file = files.find(f => f.id === id);
    if (!file) return;

    const modal = $('fileDetailModal');
    if (!modal) return;

    $('previewTitle').textContent = file.name;
    $('previewSize').textContent = formatBytes(file.size);
    const ext = file.name.split('.').pop() || file.category;
    $('previewFormat').textContent = ext;
    $('previewDate').textContent = file.date || 'Today';

    const area = $('previewArea');
    if (file.category === 'image' && file.content) {
      area.innerHTML = `<img src="${file.content}" alt="${esc(file.name)}" class="max-h-60 rounded-lg object-contain">`;
    } else if (file.category === 'code' && file.content && typeof file.content === 'string' && !file.content.startsWith('data:')) {
      area.innerHTML = `<pre class="text-left w-full max-h-52 overflow-auto text-xs bg-black/40 p-3 rounded-lg text-slate-300 font-mono">${esc(file.content.slice(0, 1000))}</pre>`;
    } else {
      const icon = ICONS[file.category] || ICONS.other;
      area.innerHTML = `
        <div class="text-5xl mb-2">${icon}</div>
        <p class="text-sm font-semibold text-white">${esc(file.name)}</p>
        <p class="text-xs text-slate-500 mt-1">Ready for download</p>
      `;
    }

    // Set download link
    const dl = $('modalDownloadBtn');
    if (dl) {
      dl.download = file.name;
      if (file.content) {
        dl.href = file.content;
      } else {
        const blob = new Blob([`Nexus File: ${file.name}\nSize: ${file.size} bytes`], { type: file.type });
        dl.href = URL.createObjectURL(blob);
      }
    }

    $('modalDeleteBtn').onclick = () => deleteFile(file.id);
    modal.classList.remove('hidden');
  };

  window.downloadFile = function (id) {
    const file = files.find(f => f.id === id);
    if (!file) return;
    const a = document.createElement('a');
    a.download = file.name;
    if (file.content) {
      a.href = file.content;
    } else {
      const blob = new Blob([`Nexus File: ${file.name}`], { type: file.type });
      a.href = URL.createObjectURL(blob);
    }
    a.click();
  };

  window.closeFileModal = function () {
    $('fileDetailModal')?.classList.add('hidden');
  };

  /* Dropdowns */
  function bindDropdowns() {
    const nB = $('notifBtn'), nP = $('notifPanel');
    const pB = $('profileBtn'), pP = $('profilePanel');
    if (!nB || !pB) return;
    const close = () => { nP?.classList.add('hidden'); pP?.classList.add('hidden'); };
    nB.addEventListener('click', e => { e.stopPropagation(); pP?.classList.add('hidden'); nP?.classList.toggle('hidden'); });
    pB.addEventListener('click', e => { e.stopPropagation(); nP?.classList.add('hidden'); pP?.classList.toggle('hidden'); });
    document.addEventListener('click', close);
  }

  /* Initialization */
  document.addEventListener('DOMContentLoaded', async () => {
    if (!API.Token.exists()) {
      window.location.href = 'auth.html';
      return;
    }

    files = getStoredFiles();

    try {
      const me = await API.auth.me();
      const user = me.user || {};
      const name = (user.name || 'User').split(' ')[0];
      if ($('avatarLetter')) $('avatarLetter').textContent = name.charAt(0).toUpperCase();
      if ($('profileName')) $('profileName').textContent = name;
      if ($('panelName')) $('panelName').textContent = user.name || 'User';
      if ($('panelEmail')) $('panelEmail').textContent = user.email || '';
      if ($('sideRoleTag')) $('sideRoleTag').textContent = user.role || 'workspace';
    } catch (e) {}

    bindDropdowns();
    renderFiles();
  });

})();
