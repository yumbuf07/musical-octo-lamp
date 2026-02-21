const STORAGE_KEY = 'paper-notes-v2';
const SESSION_KEY = 'paper-notes-session';

const els = {
  authPanel: document.getElementById('authPanel'),
  workspace: document.getElementById('workspace'),
  emailInput: document.getElementById('emailInput'),
  passwordInput: document.getElementById('passwordInput'),
  registerBtn: document.getElementById('registerBtn'),
  loginBtn: document.getElementById('loginBtn'),
  authHint: document.getElementById('authHint'),
  logoutBtn: document.getElementById('logoutBtn'),
  userBadge: document.getElementById('userBadge'),
  noteDate: document.getElementById('noteDate'),
  noteTitle: document.getElementById('noteTitle'),
  noteContent: document.getElementById('noteContent'),
  noteList: document.getElementById('noteList'),
  dateSearch: document.getElementById('dateSearch'),
  saveBtn: document.getElementById('saveBtn'),
  convertBtn: document.getElementById('convertBtn'),
  clearBtn: document.getElementById('clearBtn'),
  exportBtn: document.getElementById('exportBtn'),
  mindMap: document.getElementById('mindMap'),
  ocrImage: document.getElementById('ocrImage'),
  ocrHint: document.getElementById('ocrHint'),
  openSettingsBtn: document.getElementById('openSettingsBtn'),
  settingsDialog: document.getElementById('settingsDialog'),
  themeSelect: document.getElementById('themeSelect'),
  saveSettingsBtn: document.getElementById('saveSettingsBtn')
};

const state = {
  db: loadDb(),
  user: null,
  editingNoteId: null,
  autosaveTimer: null
};

function loadDb() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || { users: [], notesByUser: {}, settings: { theme: 'paper' } };
  } catch {
    return { users: [], notesByUser: {}, settings: { theme: 'paper' } };
  }
}

function saveDb() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.db));
}

function formatDate(date = new Date()) {
  return new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}

function applyTheme(theme) {
  document.body.className = '';
  if (theme !== 'paper') {
    document.body.classList.add(`theme-${theme}`);
  }
  state.db.settings.theme = theme;
  saveDb();
}

function hashPassword(pwd) {
  return btoa(unescape(encodeURIComponent(pwd)));
}

function getUserNotes() {
  if (!state.user) return [];
  return state.db.notesByUser[state.user.email] || [];
}

function setUserNotes(notes) {
  state.db.notesByUser[state.user.email] = notes;
  saveDb();
}

function setAuthHint(msg, isError = false) {
  els.authHint.textContent = msg;
  els.authHint.style.color = isError ? '#b22222' : '';
}

function register() {
  const email = els.emailInput.value.trim().toLowerCase();
  const password = els.passwordInput.value;
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) return setAuthHint('请输入正确邮箱。', true);
  if (password.length < 6) return setAuthHint('密码至少 6 位。', true);
  if (state.db.users.some((u) => u.email === email)) return setAuthHint('该邮箱已注册，请直接登录。', true);

  state.db.users.push({ email, passwordHash: hashPassword(password), createdAt: Date.now() });
  state.db.notesByUser[email] = [];
  saveDb();
  setAuthHint('注册成功，请点击登录。');
}

function login() {
  const email = els.emailInput.value.trim().toLowerCase();
  const password = els.passwordInput.value;
  const user = state.db.users.find((u) => u.email === email && u.passwordHash === hashPassword(password));
  if (!user) return setAuthHint('邮箱或密码错误。', true);

  state.user = { email };
  localStorage.setItem(SESSION_KEY, email);
  enterWorkspace();
}

function logout() {
  state.user = null;
  state.editingNoteId = null;
  localStorage.removeItem(SESSION_KEY);
  els.workspace.classList.add('hidden');
  els.authPanel.classList.remove('hidden');
  els.logoutBtn.classList.add('hidden');
}

function enterWorkspace() {
  els.authPanel.classList.add('hidden');
  els.workspace.classList.remove('hidden');
  els.logoutBtn.classList.remove('hidden');
  els.userBadge.textContent = state.user.email;
  els.noteDate.textContent = `记录日期：${formatDate()}`;
  renderNoteList();
  newNote();
  showEmptyTip();
}

function filteredNotes() {
  const notes = [...getUserNotes()].sort((a, b) => b.createdAt - a.createdAt);
  if (!els.dateSearch.value) return notes;
  return notes.filter((note) => note.dateIso === els.dateSearch.value);
}

function renderNoteList() {
  const notes = filteredNotes();
  els.noteList.innerHTML = notes.length ? '' : '<p class="hint">暂无笔记，先写第一条吧。</p>';
  for (const note of notes) {
    const item = document.createElement('article');
    item.className = `note-item ${note.id === state.editingNoteId ? 'active' : ''}`;
    item.innerHTML = `<strong>${note.title || '未命名笔记'}</strong><small>${note.dateLabel}</small>`;
    item.addEventListener('click', () => loadNote(note.id));
    els.noteList.appendChild(item);
  }
}

function loadNote(id) {
  const note = getUserNotes().find((n) => n.id === id);
  if (!note) return;
  state.editingNoteId = id;
  els.noteTitle.value = note.title;
  els.noteContent.value = note.content;
  els.noteDate.textContent = `记录日期：${note.dateLabel}`;
  renderNoteList();
  convertToMindMap();
}

function newNote() {
  state.editingNoteId = null;
  els.noteTitle.value = '';
  els.noteContent.value = '';
  els.noteDate.textContent = `记录日期：${formatDate()}`;
  showEmptyTip();
  renderNoteList();
}

function saveNote(isAutosave = false) {
  const title = els.noteTitle.value.trim();
  const content = els.noteContent.value.trim();
  if (!content && !title) return;

  const now = new Date();
  const noteData = {
    id: state.editingNoteId || crypto.randomUUID(),
    title,
    content,
    dateLabel: formatDate(now),
    dateIso: now.toISOString().slice(0, 10),
    createdAt: Date.now(),
    updatedAt: Date.now()
  };

  const notes = getUserNotes();
  const idx = notes.findIndex((n) => n.id === noteData.id);
  if (idx >= 0) {
    noteData.createdAt = notes[idx].createdAt;
    notes[idx] = { ...notes[idx], ...noteData };
  } else {
    notes.push(noteData);
    state.editingNoteId = noteData.id;
  }

  setUserNotes(notes);
  els.noteDate.textContent = `记录日期：${noteData.dateLabel}`;
  renderNoteList();
  if (!isAutosave) convertToMindMap();
}

function scheduleAutosave() {
  clearTimeout(state.autosaveTimer);
  state.autosaveTimer = setTimeout(() => saveNote(true), 900);
}

function createNode(text) {
  return { text, children: [] };
}

function parseIndentedText(text, rootLabel) {
  const lines = text.split('\n').map((line) => line.replace(/\t/g, '    ')).filter((line) => line.trim());
  const root = createNode(rootLabel || '未命名笔记');
  const stack = [{ indent: -1, node: root }];

  for (const rawLine of lines) {
    const indent = rawLine.match(/^ */)[0].length;
    const node = createNode(rawLine.trim());
    while (stack.length > 1 && indent <= stack[stack.length - 1].indent) stack.pop();
    stack[stack.length - 1].node.children.push(node);
    stack.push({ indent, node });
  }

  return root;
}

function renderTree(node) {
  const ul = document.createElement('ul');
  const li = document.createElement('li');
  const label = document.createElement('span');
  label.className = 'node-label';
  label.textContent = node.text;
  li.appendChild(label);

  for (const child of node.children) {
    li.appendChild(renderTree(child));
  }

  ul.appendChild(li);
  return ul;
}

function showEmptyTip() {
  els.mindMap.innerHTML = '<p class="empty-tip">请输入笔记内容后点击“转为思维导图”。</p>';
}

function convertToMindMap() {
  const title = els.noteTitle.value.trim() || '未命名笔记';
  const content = els.noteContent.value.trim();
  if (!content) return showEmptyTip();

  const tree = parseIndentedText(content, title);
  els.mindMap.innerHTML = '';
  els.mindMap.appendChild(renderTree(tree));
}

function exportNoteAsImage() {
  const title = els.noteTitle.value.trim() || '未命名笔记';
  const content = els.noteContent.value.trim() || '（无内容）';
  const canvas = document.createElement('canvas');
  canvas.width = 1200;
  canvas.height = 1500;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#f8f3e6';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#3a342f';
  ctx.font = 'bold 52px serif';
  ctx.fillText(title, 70, 100);
  ctx.font = '30px serif';
  ctx.fillText(els.noteDate.textContent, 70, 160);

  ctx.font = '34px serif';
  const lines = content.split('\n');
  let y = 230;
  for (const line of lines) {
    const wrapped = line.match(/.{1,28}/g) || [''];
    for (const seg of wrapped) {
      ctx.fillText(seg, 70, y);
      y += 48;
      if (y > canvas.height - 80) break;
    }
    if (y > canvas.height - 80) break;
  }

  const link = document.createElement('a');
  link.download = `${title.replace(/[\\/:*?"<>|]/g, '_')}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}

async function recognizeImageText(file) {
  if (!file) return;
  if (!window.Tesseract) {
    els.ocrHint.textContent = 'OCR 引擎未加载成功，请检查网络后重试。';
    return;
  }

  els.ocrHint.textContent = '识别中，请稍候...';
  const { data } = await window.Tesseract.recognize(file, 'chi_sim+eng');
  const text = data.text.trim();
  if (!text) {
    els.ocrHint.textContent = '未识别到文字。';
    return;
  }

  els.noteContent.value = `${els.noteContent.value}\n${text}`.trim();
  els.ocrHint.textContent = '识别完成，文字已追加到笔记。';
  scheduleAutosave();
}

function bindEvents() {
  els.registerBtn.addEventListener('click', register);
  els.loginBtn.addEventListener('click', login);
  els.logoutBtn.addEventListener('click', logout);

  els.saveBtn.addEventListener('click', () => saveNote(false));
  els.convertBtn.addEventListener('click', convertToMindMap);
  els.clearBtn.addEventListener('click', newNote);
  els.exportBtn.addEventListener('click', exportNoteAsImage);
  els.dateSearch.addEventListener('change', renderNoteList);

  els.noteTitle.addEventListener('input', scheduleAutosave);
  els.noteContent.addEventListener('input', scheduleAutosave);
  els.ocrImage.addEventListener('change', (e) => recognizeImageText(e.target.files[0]));

  els.openSettingsBtn.addEventListener('click', () => {
    els.themeSelect.value = state.db.settings.theme || 'paper';
    els.settingsDialog.showModal();
  });
  els.saveSettingsBtn.addEventListener('click', () => applyTheme(els.themeSelect.value));
}

function boot() {
  applyTheme(state.db.settings.theme || 'paper');
  bindEvents();

  const sessionEmail = localStorage.getItem(SESSION_KEY);
  if (sessionEmail && state.db.users.some((u) => u.email === sessionEmail)) {
    state.user = { email: sessionEmail };
    enterWorkspace();
  }
}

boot();
