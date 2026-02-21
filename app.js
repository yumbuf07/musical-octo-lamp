const noteDateEl = document.getElementById('noteDate');
const convertBtn = document.getElementById('convertBtn');
const clearBtn = document.getElementById('clearBtn');
const noteTitleInput = document.getElementById('noteTitle');
const noteContentInput = document.getElementById('noteContent');
const mindMapContainer = document.getElementById('mindMap');

function updateDateLabel() {
  const now = new Date();
  const formatted = new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(now);
  noteDateEl.textContent = `记录日期：${formatted}`;
}

function createNode(text) {
  return { text, children: [] };
}

function parseIndentedText(text, rootLabel) {
  const lines = text
    .split('\n')
    .map((line) => line.replace(/\t/g, '    '))
    .filter((line) => line.trim().length > 0);

  const root = createNode(rootLabel || '未命名笔记');
  const stack = [{ indent: -1, node: root }];

  for (const rawLine of lines) {
    const indent = rawLine.match(/^ */)[0].length;
    const content = rawLine.trim();
    const node = createNode(content);

    while (stack.length > 1 && indent <= stack[stack.length - 1].indent) {
      stack.pop();
    }

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

  if (node.children.length > 0) {
    for (const child of node.children) {
      li.appendChild(renderTree(child));
    }
  }

  ul.appendChild(li);
  return ul;
}

function showEmptyTip() {
  mindMapContainer.innerHTML = '<p class="empty-tip">请输入笔记内容后点击“转为思维导图”。</p>';
}

function convertToMindMap() {
  const title = noteTitleInput.value.trim() || '未命名笔记';
  const content = noteContentInput.value.trim();

  if (!content) {
    showEmptyTip();
    return;
  }

  const tree = parseIndentedText(content, title);
  mindMapContainer.innerHTML = '';
  mindMapContainer.appendChild(renderTree(tree));
}

convertBtn.addEventListener('click', convertToMindMap);
clearBtn.addEventListener('click', () => {
  noteTitleInput.value = '';
  noteContentInput.value = '';
  updateDateLabel();
  showEmptyTip();
});

updateDateLabel();
showEmptyTip();
