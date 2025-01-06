const ICONS = ['📌', '⭐', '🔥', '🎯', '⚡', '🔍', '📊', '⚙️'];

let items = JSON.parse(localStorage.getItem('treeItems')) || [];
let expandedState = JSON.parse(localStorage.getItem('expandedState')) || {};
let focusedId = null;
let activeIconPanel = null;

function showMessage(message, duration = 3000) {
    const modal = document.getElementById('messageModal');
    modal.textContent = message;
    modal.classList.add('visible');
    setTimeout(() => {
        modal.classList.remove('visible');
    }, duration);
}

function exportData() {
    const data = {
        items: items,
        expandedState: expandedState
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'tree-data.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showMessage('Данные успешно экспортированы');
}

function handleImport(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);
            items = data.items || [];
            expandedState = data.expandedState || {};
            saveToLocalStorage();
            renderTree();
            showMessage('Данные успешно импортированы');
        } catch (error) {
            showMessage('Ошибка при импорте файла');
        }
        event.target.value = '';
    };
    reader.readAsText(file);
}

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function findItemParent(items, id, parent = null) {
    for (let item of items) {
        if (item.id === id) return parent;
        const found = findItemParent(item.children, id, item);
        if (found) return found;
    }
    return null;
}

function findSiblings(items, id) {
    const parent = findItemParent(items, id);
    return parent ? parent.children : items;
}

function createIconPanel(item, contentElement) {
    if (activeIconPanel) {
        activeIconPanel.remove();
        activeIconPanel = null;
    }

    const panel = document.createElement('div');
    panel.className = 'icon-panel visible';
    
    const removeBtn = document.createElement('button');
    removeBtn.className = 'icon-btn';
    removeBtn.innerHTML = '❌';
    removeBtn.onclick = (e) => {
        e.stopPropagation();
        item.iconIndex = -1;
        saveToLocalStorage();
        renderTree();
    };
    panel.appendChild(removeBtn);

    ICONS.forEach((icon, index) => {
        const btn = document.createElement('button');
        btn.className = `icon-btn ${item.iconIndex === index ? 'active' : ''}`;
        btn.innerHTML = icon;
        btn.onclick = (e) => {
            e.stopPropagation();
            item.iconIndex = index;
            saveToLocalStorage();
            renderTree();
        };
        panel.appendChild(btn);
    });

    return panel;
}

function addNewItem(parentId = null) {
    const newItem = {
        id: generateId(),
        text: '',
        children: [],
        iconIndex: -1
    };

    if (parentId) {
        const parent = findItemById(items, parentId);
        if (parent) {
            parent.children.push(newItem);
            expandedState[parentId] = true;
        }
    } else {
        items.push(newItem);
    }

    focusedId = newItem.id;
    saveToLocalStorage();
    renderTree();
}

function findItemById(items, id) {
    for (let item of items) {
        if (item.id === id) return item;
        const found = findItemById(item.children, id);
        if (found) return found;
    }
    return null;
}

function moveItem(id, direction) {
    const siblings = findSiblings(items, id);
    const index = siblings.findIndex(item => item.id === id);
    if (index === -1) return;

    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex >= 0 && newIndex < siblings.length) {
        const temp = siblings[index];
        siblings[index] = siblings[newIndex];
        siblings[newIndex] = temp;
        saveToLocalStorage();
        renderTree();
    }
}

function toggleItem(id, e) {
    e.stopPropagation();
    expandedState[id] = !expandedState[id];
    saveToLocalStorage();
    renderTree();
}

function updateItemText(id, text) {
    const item = findItemById(items, id);
    if (item) {
        item.text = text;
        saveToLocalStorage();
    }
}

function deleteItem(id) {
    const parent = findItemParent(items, id);
    const targetArray = parent ? parent.children : items;
    const index = targetArray.findIndex(item => item.id === id);
    if (index !== -1) {
        targetArray.splice(index, 1);
        saveToLocalStorage();
        renderTree();
    }
}

function autoResize(textarea) {
    textarea.style.height = 'auto';
    textarea.style.height = textarea.scrollHeight + 'px';
}

function createTreeItem(item) {
    const li = document.createElement('li');
    li.className = `tree-item ${expandedState[item.id] ? 'expanded' : ''} ${focusedId === item.id ? 'focused' : ''}`;

    const content = document.createElement('div');
    content.className = 'tree-content';
    content.onclick = (e) => {
        e.stopPropagation();
        focusedId = item.id;
        renderTree();
    };

    const toggleBtn = document.createElement('button');
    toggleBtn.className = 'toggle-btn';
    toggleBtn.innerHTML = '▸';
    toggleBtn.onclick = (e) => toggleItem(item.id, e);

    const textarea = document.createElement('textarea');
    textarea.className = 'tree-item-text';
    textarea.value = item.text;
    textarea.placeholder = 'Введите текст...';
    textarea.spellcheck = true;
    textarea.lang = 'ru';
    textarea.rows = 1;
    textarea.onclick = (e) => e.stopPropagation();
    textarea.oninput = (e) => {
        updateItemText(item.id, e.target.value);
        autoResize(e.target);
    };

    if (focusedId === item.id) {
        setTimeout(() => {
            textarea.focus();
            autoResize(textarea);
        }, 0);
    } else {
        setTimeout(() => autoResize(textarea), 0);
    }

    const actions = document.createElement('div');
    actions.className = 'action-buttons';

    const siblings = findSiblings(items, item.id);
    const index = siblings.findIndex(i => i.id === item.id);

    const toggleIconBtn = document.createElement('button');
    toggleIconBtn.className = 'action-btn';
    toggleIconBtn.innerHTML = '🏷️';
    toggleIconBtn.onclick = (e) => {
        e.stopPropagation();
        const panel = createIconPanel(item, content);
        content.appendChild(panel);
        activeIconPanel = panel;
    };

    const moveUpBtn = document.createElement('button');
    moveUpBtn.className = 'action-btn';
    moveUpBtn.innerHTML = '↑';
    moveUpBtn.disabled = index === 0;
    moveUpBtn.onclick = (e) => {
        e.stopPropagation();
        moveItem(item.id, 'up');
    };

    const moveDownBtn = document.createElement('button');
    moveDownBtn.className = 'action-btn';
    moveDownBtn.innerHTML = '↓';
    moveDownBtn.disabled = index === siblings.length - 1;
    moveDownBtn.onclick = (e) => {
        e.stopPropagation();
        moveItem(item.id, 'down');
    };

    const addBtn = document.createElement('button');
    addBtn.className = 'action-btn';
    addBtn.innerHTML = '＋';
    addBtn.onclick = (e) => {
        e.stopPropagation();
        addNewItem(item.id);
    };

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'action-btn';
    deleteBtn.innerHTML = '×';
    deleteBtn.onclick = (e) => {
        e.stopPropagation();
        deleteItem(item.id);
    };

    actions.appendChild(toggleIconBtn);
    actions.appendChild(moveUpBtn);
    actions.appendChild(moveDownBtn);
    actions.appendChild(addBtn);
    actions.appendChild(deleteBtn);

    content.appendChild(toggleBtn);
    content.appendChild(textarea);
    content.appendChild(actions);

    if (item.iconIndex >= 0) {
        const icon = document.createElement('span');
        icon.className = 'item-icon';
        icon.innerHTML = ICONS[item.iconIndex];
        content.appendChild(icon);
    }

    if (item.children && item.children.length > 0) {
        const indicator = document.createElement('span');
        indicator.className = 'child-indicator';
        indicator.innerHTML = '•';
        content.appendChild(indicator);
    }

    li.appendChild(content);

    if (item.children && item.children.length > 0) {
        const ul = document.createElement('ul');
        ul.className = 'nested tree-list';
        item.children.forEach(child => {
            ul.appendChild(createTreeItem(child));
        });
        li.appendChild(ul);
    }

    return li;
}

function renderTree() {
    const mainList = document.getElementById('mainList');
    mainList.innerHTML = '';
    items.forEach(item => {
        mainList.appendChild(createTreeItem(item));
    });
}

function saveToLocalStorage() {
    localStorage.setItem('treeItems', JSON.stringify(items));
    localStorage.setItem('expandedState', JSON.stringify(expandedState));
}

document.addEventListener('click', function(e) {
    if (!e.target.closest('.icon-panel') && !e.target.closest('.action-btn')) {
        if (activeIconPanel) {
            activeIconPanel.remove();
            activeIconPanel = null;
        }
    }
    if (!e.target.closest('.tree-content')) {
        focusedId = null;
        renderTree();
    }
});

renderTree();
