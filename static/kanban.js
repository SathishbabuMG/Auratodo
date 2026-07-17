export class KanbanBoard {
    constructor(options = {}) {
        this.tasks = [];
        this.onUpdate = options.onUpdate || (() => {});
        
        // Modal Elements
        this.modal = document.getElementById('task-modal');
        this.modalClose = document.getElementById('modal-close');
        this.btnCancel = document.getElementById('btn-cancel-task');
        this.btnSave = document.getElementById('btn-save-task');
        this.btnDelete = document.getElementById('btn-delete-task');
        
        this.inputTitle = document.getElementById('task-input-title');
        this.inputDesc = document.getElementById('task-input-desc');
        this.inputId = document.getElementById('task-input-id');
        this.inputStatus = document.getElementById('task-input-status');
        
        this.initEvents();
    }
    
    setTasks(tasks) {
        this.tasks = tasks;
        this.renderAll();
    }
    
    initEvents() {
        // Modal cancel/close actions
        this.modalClose.addEventListener('click', () => this.hideModal());
        this.btnCancel.addEventListener('click', () => this.hideModal());
        
        // Modal save action
        this.btnSave.addEventListener('click', () => this.saveTaskFromModal());
        
        // Modal delete action
        this.btnDelete.addEventListener('click', () => this.deleteTaskFromModal());
        
        // Setup triggers for "Add task" buttons (Column 1 is TODO)
        const btnAddTodo = document.getElementById('btn-add-todo');
        if (btnAddTodo) {
            btnAddTodo.addEventListener('click', () => {
                this.showModalForAdd('todo');
            });
        }
        
        // Drag and drop column event listeners
        const columns = document.querySelectorAll('.kanban-column');
        columns.forEach(col => {
            col.addEventListener('dragover', (e) => this.handleDragOver(e, col));
            col.addEventListener('dragleave', () => col.classList.remove('drag-over'));
            col.addEventListener('drop', (e) => this.handleDrop(e, col));
        });
    }
    
    // Render all task columns
    renderAll() {
        const containers = {
            'todo': document.getElementById('tasks-todo'),
            'in-progress': document.getElementById('tasks-in-progress'),
            'done': document.getElementById('tasks-done')
        };
        
        // Counters
        const counters = {
            'todo': document.getElementById('count-todo'),
            'in-progress': document.getElementById('count-in-progress'),
            'done': document.getElementById('count-done')
        };
        
        // Clear containers
        Object.keys(containers).forEach(status => {
            if (containers[status]) {
                containers[status].innerHTML = '';
            }
        });
        
        // Populate containers
        const counts = { 'todo': 0, 'in-progress': 0, 'done': 0 };
        
        this.tasks.forEach(task => {
            const container = containers[task.status];
            if (container) {
                const card = this.createCardElement(task);
                container.appendChild(card);
                counts[task.status]++;
            }
        });
        
        // Update column badge counts
        Object.keys(counters).forEach(status => {
            if (counters[status]) {
                counters[status].textContent = counts[status];
            }
        });
    }
    
    createCardElement(task) {
        const card = document.createElement('div');
        card.className = 'task-card';
        card.draggable = true;
        card.dataset.id = task.id;
        
        // Build card HTML
        card.innerHTML = `
            <h4 class="task-title">${this.escapeHTML(task.title)}</h4>
            <p class="task-desc">${task.description ? this.escapeHTML(task.description) : ''}</p>
            <div class="task-footer">
                <span class="task-date">${this.formatDate(task.created_at)}</span>
            </div>
        `;
        
        // Drag listeners
        card.addEventListener('dragstart', (e) => {
            card.classList.add('dragging');
            e.dataTransfer.setData('text/plain', task.id);
            e.dataTransfer.effectAllowed = 'move';
        });
        
        card.addEventListener('dragend', () => {
            card.classList.remove('dragging');
        });
        
        // Click to edit listener
        card.addEventListener('click', () => {
            this.showModalForEdit(task);
        });
        
        return card;
    }
    
    // Drag & Drop Handlers
    handleDragOver(e, column) {
        e.preventDefault();
        column.classList.add('drag-over');
    }
    
    handleDrop(e, column) {
        e.preventDefault();
        column.classList.remove('drag-over');
        
        const taskId = e.dataTransfer.getData('text/plain');
        const targetStatus = column.dataset.status;
        
        const task = this.tasks.find(t => t.id === taskId);
        if (task && task.status !== targetStatus) {
            const oldStatus = task.status;
            task.status = targetStatus;
            
            // If dragging into Completed, increment stats complete count
            let statsModified = false;
            if (targetStatus === 'done' && oldStatus !== 'done') {
                statsModified = 'completed_task';
            }
            
            this.renderAll();
            this.onUpdate(this.tasks, statsModified);
        }
    }
    
    // Modal Management
    showModalForAdd(status) {
        this.inputTitle.value = '';
        this.inputDesc.value = '';
        this.inputId.value = '';
        this.inputStatus.value = status;
        
        document.getElementById('modal-title-text').textContent = 'Create New Task';
        this.btnDelete.classList.add('hidden');
        
        this.modal.classList.remove('hidden');
        this.inputTitle.focus();
    }
    
    showModalForEdit(task) {
        this.inputTitle.value = task.title;
        this.inputDesc.value = task.description || '';
        this.inputId.value = task.id;
        this.inputStatus.value = task.status;
        
        document.getElementById('modal-title-text').textContent = 'Edit Task Details';
        this.btnDelete.classList.remove('hidden');
        
        this.modal.classList.remove('hidden');
    }
    
    hideModal() {
        this.modal.classList.add('hidden');
    }
    
    saveTaskFromModal() {
        const id = this.inputId.value;
        const title = this.inputTitle.value.trim();
        const desc = this.inputDesc.value.trim();
        const status = this.inputStatus.value;
        
        if (!title) {
            alert('Please enter a task title');
            return;
        }
        
        if (id) {
            // Edit existing
            const task = this.tasks.find(t => t.id === id);
            if (task) {
                task.title = title;
                task.description = desc;
            }
        } else {
            // Create new
            const newTask = {
                id: 'task-' + Date.now(),
                title: title,
                description: desc,
                status: status,
                created_at: new Date().toISOString()
            };
            this.tasks.push(newTask);
        }
        
        this.hideModal();
        this.renderAll();
        this.onUpdate(this.tasks);
    }
    
    deleteTaskFromModal() {
        const id = this.inputId.value;
        if (!id) return;
        
        if (confirm('Are you sure you want to delete this task?')) {
            const index = this.tasks.findIndex(t => t.id === id);
            if (index !== -1) {
                this.tasks.splice(index, 1);
            }
            this.hideModal();
            this.renderAll();
            this.onUpdate(this.tasks);
        }
    }
    
    // Helpers
    escapeHTML(str) {
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }
    
    formatDate(isoString) {
        if (!isoString) return '';
        try {
            const date = new Date(isoString);
            return date.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric'
            });
        } catch (e) {
            return '';
        }
    }
}
