// inicjalizacja IndexedDB
 
let db;
const DB_NAME = 'todoDB';
const USER_STORE = 'user';
const TODOS_STORE = 'todos';

const request = indexedDB.open(DB_NAME);

request.onupgradeneeded = (event) => {
    db = event.target.result;

    if (!db.objectStoreNames.contains(USER_STORE)) {
        db.createObjectStore(USER_STORE, { keyPath: 'key' });
    }

    if (!db.objectStoreNames.contains(TODOS_STORE)) {
        db.createObjectStore(TODOS_STORE, { autoIncrement: true });
    }
};

request.onsuccess = () => {
    db = request.result;
    checkUserSession();
};


// obsługa logowania po stronie IndexedDB

function saveUserId(id) {
    const tx = db.transaction(USER_STORE, 'readwrite');
    const store = tx.objectStore(USER_STORE);
    store.put({ key: 'user_id', value: id });
    tx.oncomplete = () => {
        displayTodoList();
    };
}

function getUserId(callback) {
    const tx = db.transaction(USER_STORE, 'readonly');
    const store = tx.objectStore(USER_STORE);
    const req = store.get('user_id');
    req.onsuccess = () => {
        callback(req.result ? req.result.value : null);
    };
}

function removeUserId(callback) {
    const tx = db.transaction(USER_STORE, 'readwrite');
    const store = tx.objectStore(USER_STORE);
    store.delete('user_id');
    tx.oncomplete = callback;
}

// logika logowania

function setUser() {
    const user_id = document.getElementById('user-id').value;
    if (user_id >= 1 && user_id <= 10) {
        saveUserId(user_id);
    } else {
        alert('Podaj poprawne ID użytkownika (1–10)');
    }
}

function changeUser() {
    removeUserId(() => {
        showLoginPage();
    });
}

function checkUserSession() {
    getUserId((id) => {
        if (id) {
            displayTodoList();
        } else {
            showLoginPage();
        }
    });
}

// strona logownia

function showLoginPage() {
    document.getElementById('login-page').style.display = 'block';
    document.getElementById('todo-list').style.display = 'none';
    document.getElementById('todo-detail').style.display = 'none';
    document.getElementById('nav-panel-logged').style.display = 'none';
}

// lista zadań

function displayTodoList() {
    getUserId(user_id => {
        if (!user_id) return;

        // tylko API-tasks resetujemy
        const todoList = document.getElementById('todo-list');
        todoList.style.display = 'block';
        todoList.innerHTML = `
            <h2>Zadania użytkownika ${user_id}</h2>
            <form id="todo-form">
                <input type="text" id="todo-title" placeholder="Nowe zadanie" required>
                <button type="submit">Dodaj</button>
            </form>
            <div id="local-todos"><h3>Lokalne zadania:</h3></div>
            <div id="api-todos"><h3>Zadania z serwera:</h3></div>
        `;

        document.getElementById('login-page').style.display = 'none';
        document.getElementById('todo-detail').style.display = 'none';
        document.getElementById('nav-panel-logged').style.display = 'block';

        fetch(`https://jsonplaceholder.typicode.com/todos?userId=${user_id}`)
            .then(response => response.json())
            .then(data => {
                const apiTodos = document.getElementById('api-todos');
                data.forEach(todo => {
                    const block = document.createElement('div');
                    block.classList.add('todo-item');
                    block.innerHTML = `
                        <h3>${todo.title}</h3>
                        <p>Status: ${todo.completed ? 'Zrobione' : 'Nie zrobione'}</p>
                        <button onclick="showTodoDetail(${todo.id})">Szczegóły</button>
                    `;
                    apiTodos.appendChild(block);
                });
            })
            .catch(error => console.error('Błąd podczas pobierania danych:', error));

        showLocalTodos();
    });
}

// szczegóły zadania

function showTodoDetail(id) {
    fetch(`https://jsonplaceholder.typicode.com/todos/${id}`)
        .then(response => response.json())
        .then(data => {
            const detail = document.getElementById('todo-detail');
            detail.innerHTML = `
                <h2>Szczegóły zadania</h2>
                <h3>${data.title}</h3>
                <p>Status: ${data.completed ? 'Zrobione' : 'Nie zrobione'}</p>
                <button onclick="displayTodoList()">Powrót</button>
            `;
            document.getElementById('todo-list').style.display = 'none';
            document.getElementById('login-page').style.display = 'none';
            document.getElementById('todo-detail').style.display = 'block';
            document.getElementById('nav-panel-logged').style.display = 'block';
        })
        .catch(err => console.error('Błąd API:', err));
}

// lokalne zadania

function showLocalTodos() {
    const localList = document.getElementById('local-todos');
    if (!localList || !db) return;

    localList.innerHTML = '<h3>Lokalne zadania:</h3>';
    const tx = db.transaction('todos', 'readonly');
    const store = tx.objectStore('todos');

    store.openCursor().onsuccess = function (event) {
        const cursor = event.target.result;
        if (cursor) {
            const item = cursor.value;
            const el = document.createElement('div');
            el.classList.add('todo-item');
            el.innerHTML = `
                <h3>${item.title}</h3>
                <p>Status: ${item.completed ? 'Zrobione' : 'Nie zrobione'}</p>
            `;
            localList.appendChild(el);
            cursor.continue();
        }
    };
}

// obsługa formularza dodawania zadań

document.addEventListener('submit', function (e) {
    if (e.target && e.target.id === 'todo-form') {
        e.preventDefault();
        const title = document.getElementById('todo-title').value.trim();
        if (!title || !db) return;

        const tx = db.transaction(TODOS_STORE, 'readwrite');
        const store = tx.objectStore(TODOS_STORE);
        store.add({ title, completed: false });

        tx.oncomplete = () => {
            document.getElementById('todo-title').value = '';
            showLocalTodos();
        };
    }
});
