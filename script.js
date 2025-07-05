document.addEventListener("DOMContentLoaded", () => {
    // Storage key
    const STORAGE_KEY = 'advanced-todo-list';
    
    // DOM elements
    const todoForm = document.getElementById('todo-form');
    const todoInput = document.getElementById('todo-input');
    const dueDateInput = document.getElementById('due-date-input');
    const categorySelect = document.getElementById('category-select');
    const prioritySelect = document.getElementById('priority-select');
    const subtaskInput = document.getElementById('subtask-input');
    const todoList = document.getElementById('todo-list');
    const progressBar = document.getElementById('progress-bar');
    const editModal = document.getElementById('edit-modal');
    const darkToggle = document.getElementById('dark-toggle');
    const categoryFilter = document.getElementById('category-filter');
    const priorityFilter = document.getElementById('priority-filter');
    const statusFilter = document.getElementById('status-filter');
    const searchInput = document.getElementById('search-input');
    const emptyState = document.getElementById('empty-state');

    // State
    let todos = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    let editingIndex = null;

    // Initialize dark mode
    const isDarkMode = localStorage.getItem('darkMode') === 'true';
    darkToggle.checked = isDarkMode;
    document.documentElement.classList.toggle('dark', isDarkMode);

    // Save todos to localStorage
    function saveTodos() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
    }

    // Get priority color
    function getPriorityColor(priority) {
        switch (priority) {
            case 'high': return 'border-red-500 bg-red-50 dark:bg-red-900/20';
            case 'medium': return 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20';
            case 'low': return 'border-green-500 bg-green-50 dark:bg-green-900/20';
            default: return 'border-gray-500 bg-gray-50 dark:bg-gray-900/20';
        }
    }

    // Get priority badge color
    function getPriorityBadgeColor(priority) {
        switch (priority) {
            case 'high': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
            case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
            case 'low': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
            default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
        }
    }

    // Get category badge color
    function getCategoryBadgeColor(category) {
        switch (category) {
            case 'work': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
            case 'personal': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
            case 'shopping': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
            default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
        }
    }

    // Format date for display
    function formatDate(dateStr) {
        if (!dateStr) return '—';
        const date = new Date(dateStr);
        const today = new Date();
        const diffTime = date.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return 'Tomorrow';
        if (diffDays === -1) return 'Yesterday';
        if (diffDays < 0) return `${Math.abs(diffDays)} days ago`;
        if (diffDays < 7) return `${diffDays} days`;
        
        return date.toLocaleDateString();
    }

    // Check if task is overdue
    function isOverdue(dateStr) {
        if (!dateStr) return false;
        const date = new Date(dateStr);
        const today = new Date();
        return date < today;
    }

    // Render todos
    function renderTodos() {
        const searchTerm = searchInput.value.toLowerCase();
        const filteredTodos = todos.filter(todo => {
            const matchesSearch = todo.text.toLowerCase().includes(searchTerm);
            const matchesCategory = categoryFilter.value === 'all' || todo.category === categoryFilter.value;
            const matchesPriority = priorityFilter.value === 'all' || todo.priority === priorityFilter.value;
            const matchesStatus = statusFilter.value === 'all' || 
                (statusFilter.value === 'completed' && todo.completed) ||
                (statusFilter.value === 'pending' && !todo.completed);
            
            return matchesSearch && matchesCategory && matchesPriority && matchesStatus;
        });

        todoList.innerHTML = '';
        
        if (filteredTodos.length === 0) {
            emptyState.classList.remove('hidden');
            return;
        }
        
        emptyState.classList.add('hidden');

        let completedCount = 0;
        const totalCount = todos.length;

        filteredTodos.forEach((todo, index) => {
            const originalIndex = todos.indexOf(todo);
            const li = document.createElement('li');
            li.className = `p-4 rounded-lg shadow-sm border-l-4 transition-all duration-200 hover:shadow-md ${getPriorityColor(todo.priority)} ${todo.completed ? 'opacity-60' : ''}`;
            li.setAttribute('data-index', originalIndex);

            // Calculate subtask completion
            const subtaskCompletion = todo.subtasks?.length ? 
                todo.subtasks.filter(st => st.done).length / todo.subtasks.length : 0;

            // Build subtasks HTML
            let subtasksHTML = '';
            if (todo.subtasks?.length) {
                subtasksHTML = `
                    <div class="mt-3 pl-6">
                        <div class="text-xs text-gray-500 dark:text-gray-400 mb-2">
                            Subtasks (${todo.subtasks.filter(st => st.done).length}/${todo.subtasks.length})
                        </div>
                        <ul class="space-y-2">
                            ${todo.subtasks.map((subtask, subIndex) => `
                                <li class="flex items-center gap-2">
                                    <input 
                                        type="checkbox" 
                                        ${subtask.done ? 'checked' : ''} 
                                        onchange="toggleSubtask(${originalIndex}, ${subIndex})"
                                        class="w-4 h-4 accent-indigo-600" 
                                    />
                                    <span class="text-sm ${subtask.done ? 'line-through text-gray-500 dark:text-gray-400' : ''}">${subtask.text}</span>
                                </li>
                            `).join('')}
                        </ul>
                    </div>
                `;
            }

            // Handle long text with read more/less
            let displayText = todo.text;
            let readMoreHTML = '';
            if (todo.text.length > 50) {
                displayText = todo.text.substring(0, 50) + '...';
                readMoreHTML = `
                    <span id="more-text-${originalIndex}" class="hidden">${todo.text.substring(50)}</span>
                    <button id="read-more-${originalIndex}" onclick="toggleReadMore(${originalIndex})" class="read-more-link ml-1 text-sm">
                        Read more
                    </button>
                `;
            }

            // Check if completed
            if (todo.completed) completedCount++;

            // Due date styling
            const dueDateClass = isOverdue(todo.dueDate) && !todo.completed ? 'text-red-600 dark:text-red-400 font-semibold' : 'text-gray-500 dark:text-gray-400';

            li.innerHTML = `
                <div class="flex justify-between items-start mb-3">
                    <div class="flex items-center gap-3 flex-1">
                        <input 
                            type="checkbox" 
                            onchange="toggleComplete(${originalIndex})" 
                            ${todo.completed ? 'checked' : ''}
                            class="w-5 h-5 accent-indigo-600" 
                        />
                        <div class="flex-1">
                            <div class="flex items-center gap-2 mb-1">
                                <span class="font-medium ${todo.completed ? 'line-through text-gray-500 dark:text-gray-400' : ''}">
                                    <span id="todo-text-${originalIndex}">${displayText}</span>
                                    ${readMoreHTML}
                                </span>
                            </div>
                            <div class="flex items-center gap-2 text-xs">
                                <span class="px-2 py-1 rounded-full ${getPriorityBadgeColor(todo.priority)}">${todo.priority}</span>
                                <span class="px-2 py-1 rounded-full ${getCategoryBadgeColor(todo.category)}">${todo.category}</span>
                                <span class="${dueDateClass}">
                                    ${isOverdue(todo.dueDate) && !todo.completed ? '⚠️ ' : ''}${formatDate(todo.dueDate)}
                                </span>
                            </div>
                        </div>
                    </div>
                    <div class="flex gap-2 ml-4">
                        <button onclick="editTask(${originalIndex})" class="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm font-medium">
                            Edit
                        </button>
                        <button onclick="deleteTask(${originalIndex})" class="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 text-sm font-medium">
                            Delete
                        </button>
                    </div>
                </div>
                ${subtasksHTML}
            `;

            todoList.appendChild(li);
        });

        // Update progress bar
        const completionPercentage = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
        progressBar.style.width = `${completionPercentage}%`;
    }

    // Toggle task completion
    window.toggleComplete = (index) => {
        todos[index].completed = !todos[index].completed;
        saveTodos();
        renderTodos();
    };

    // Toggle subtask completion
    window.toggleSubtask = (taskIndex, subtaskIndex) => {
        todos[taskIndex].subtasks[subtaskIndex].done = !todos[taskIndex].subtasks[subtaskIndex].done;
        saveTodos();
        renderTodos();
    };

    // Delete task
    window.deleteTask = (index) => {
        if (confirm('Are you sure you want to delete this task?')) {
            todos.splice(index, 1);
            saveTodos();
            renderTodos();
        }
    };

    // Edit task
    window.editTask = (index) => {
        editingIndex = index;
        const todo = todos[index];
        
        document.getElementById('edit-text').value = todo.text;
        document.getElementById('edit-date').value = todo.dueDate || '';
        document.getElementById('edit-category').value = todo.category;
        document.getElementById('edit-priority').value = todo.priority;
        
        editModal.classList.remove('hidden');
        editModal.classList.add('flex');
    };

    // Toggle read more/less
    window.toggleReadMore = (index) => {
        const todoText = document.getElementById(`todo-text-${index}`);
        const moreText = document.getElementById(`more-text-${index}`);
        const readMoreBtn = document.getElementById(`read-more-${index}`);
        
        if (moreText.classList.contains('hidden')) {
            moreText.classList.remove('hidden');
            moreText.classList.add('inline');
            readMoreBtn.textContent = ' Read less';
            todoText.textContent = todos[index].text;
        } else {
            moreText.classList.add('hidden');
            moreText.classList.remove('inline');
            readMoreBtn.textContent = 'Read more';
            todoText.textContent = todos[index].text.substring(0, 50) + '...';
        }
    };

    // Form submission
    todoForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const subtasks = subtaskInput.value
            .split(',')
            .filter(s => s.trim())
            .map(s => ({
                text: s.trim(),
                done: false
            }));

        const newTodo = {
            text: todoInput.value.trim(),
            dueDate: dueDateInput.value,
            category: categorySelect.value,
            priority: prioritySelect.value,
            completed: false,
            subtasks: subtasks,
            createdAt: new Date().toISOString()
        };

        todos.push(newTodo);
        saveTodos();
        
        // Reset form
        todoForm.reset();
        prioritySelect.value = 'medium';
        
        renderTodos();
    });

    // Edit modal save
    document.getElementById('save-edit').addEventListener('click', () => {
        const newText = document.getElementById('edit-text').value.trim();
        const newDate = document.getElementById('edit-date').value;
        const newCategory = document.getElementById('edit-category').value;
        const newPriority = document.getElementById('edit-priority').value;
        
        if (newText && editingIndex !== null) {
            todos[editingIndex].text = newText;
            todos[editingIndex].dueDate = newDate;
            todos[editingIndex].category = newCategory;
            todos[editingIndex].priority = newPriority;
            
            saveTodos();
            renderTodos();
            
            editModal.classList.add('hidden');
            editModal.classList.remove('flex');
            editingIndex = null;
        }
    });

    // Edit modal cancel
    document.getElementById('cancel-edit').addEventListener('click', () => {
        editModal.classList.add('hidden');
        editModal.classList.remove('flex');
        editingIndex = null;
    });

    // Dark mode toggle
    darkToggle.addEventListener('change', () => {
        const isDark = darkToggle.checked;
        document.documentElement.classList.toggle('dark', isDark);
        localStorage.setItem('darkMode', isDark.toString());
    });

    // Filter event listeners
    categoryFilter.addEventListener('change', renderTodos);
    priorityFilter.addEventListener('change', renderTodos);
    statusFilter.addEventListener('change', renderTodos);
    searchInput.addEventListener('input', renderTodos);

    // Close modal when clicking outside
    editModal.addEventListener('click', (e) => {
        if (e.target === editModal) {
            editModal.classList.add('hidden');
            editModal.classList.remove('flex');
            editingIndex = null;
        }
    });

    // Initialize sortable
    new Sortable(todoList, {
        animation: 150,
        ghostClass: 'sortable-ghost',
        chosenClass: 'sortable-chosen',
        onEnd: function(evt) {
            const filteredTodos = todos.filter(todo => {
                const searchTerm = searchInput.value.toLowerCase();
                const matchesSearch = todo.text.toLowerCase().includes(searchTerm);
                const matchesCategory = categoryFilter.value === 'all' || todo.category === categoryFilter.value;
                const matchesPriority = priorityFilter.value === 'all' || todo.priority === priorityFilter.value;
                const matchesStatus = statusFilter.value === 'all' || 
                    (statusFilter.value === 'completed' && todo.completed) ||
                    (statusFilter.value === 'pending' && !todo.completed);
                
                return matchesSearch && matchesCategory && matchesPriority && matchesStatus;
            });
            
            const oldIndex = parseInt(evt.item.getAttribute('data-index'));
            const newIndex = evt.newIndex;
            
            // Find the todo in the filtered list and move it
            const movedTodo = todos.find(todo => todos.indexOf(todo) === oldIndex);
            const targetTodo = filteredTodos[newIndex];
            
            if (movedTodo && targetTodo) {
                const movedTodoIndex = todos.indexOf(movedTodo);
                const targetTodoIndex = todos.indexOf(targetTodo);
                
                // Remove from old position
                todos.splice(movedTodoIndex, 1);
                // Insert at new position
                todos.splice(targetTodoIndex, 0, movedTodo);
                
                saveTodos();
                renderTodos();
            }
        }
    });

    // Initial render
    renderTodos();
});