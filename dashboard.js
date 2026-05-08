document.addEventListener("DOMContentLoaded", () => {
    // ---- DATABASE SIMULATION LAYER ----
    // To meet hackathon requirements without a provided Firebase config,
    // this acts as a persistent LocalStorage DB that strictly behaves like a real DB.
    
    const DB = {
        getUser: (email) => JSON.parse(localStorage.getItem(`user_${email}`)),
        saveUser: (email, data) => localStorage.setItem(`user_${email}`, JSON.stringify(data)),
        getTasks: (email) => JSON.parse(localStorage.getItem(`tasks_${email}`)) || [],
        saveTasks: (email, tasks) => localStorage.setItem(`tasks_${email}`, JSON.stringify(tasks))
    };

    // ---- AUTHENTICATION CHECK ----
    const currentUserEmail = localStorage.getItem('currentUser');
    if (!currentUserEmail) {
        window.location.href = 'index.html'; // Redirect to login if not authenticated
        return;
    }

    // Initialize/Fetch User Data
    let userData = DB.getUser(currentUserEmail);
    
    // If new user (empty state)
    let isNewUser = false;
    if (!userData) {
        isNewUser = true;
        userData = {
            name: currentUserEmail.split('@')[0],
            email: currentUserEmail,
            role: localStorage.getItem('currentRole') || 'student',
            productivityScore: 0,
            tasksCompleted: 0,
            studyStreak: 0,
            attendanceRate: 0,
            joinDate: new Date().toISOString(),
            chartData: [0, 0, 0, 0, 0, 0, 0] // Weekly hours
        };
        DB.saveUser(currentUserEmail, userData);
    }

    let tasks = DB.getTasks(currentUserEmail);

    // ---- UI POPULATION ----
    document.getElementById('userName').textContent = userData.name;
    document.getElementById('welcomeMessage').textContent = `Welcome back, ${userData.name}!`;
    document.getElementById('navStreak').textContent = userData.studyStreak;
    document.getElementById('userAvatar').src = `https://ui-avatars.com/api/?name=${userData.name}&background=9d00ff&color=fff`;

    // Elements
    const emptyStateAlert = document.getElementById('emptyStateAlert');
    const tasksCompletedEl = document.getElementById('tasksCompletedValue');
    const streakEl = document.getElementById('streakValue');
    const attendanceEl = document.getElementById('attendanceValue');
    
    function updateDashboardUI() {
        // Calculate dynamic productivity score based on tasks and attendance
        const maxTasks = 20;
        let taskScore = Math.min((userData.tasksCompleted / maxTasks) * 50, 50); // up to 50%
        let attScore = (userData.attendanceRate / 100) * 50; // up to 50%
        
        if (userData.tasksCompleted === 0) taskScore = 0;
        userData.productivityScore = Math.round(taskScore + attScore);
        
        // Update stats
        tasksCompletedEl.textContent = userData.tasksCompleted;
        streakEl.textContent = userData.studyStreak;
        attendanceEl.textContent = `${userData.attendanceRate}%`;

        // Update Circular Ring
        const ring = document.getElementById('scoreRing');
        const scoreValue = document.getElementById('scoreValue');
        const circumference = 2 * Math.PI * 52; // r=52
        
        // Animate score number
        let currentScore = parseInt(scoreValue.textContent) || 0;
        const targetScore = userData.productivityScore;
        const offset = circumference - (targetScore / 100) * circumference;
        ring.style.strokeDashoffset = offset;

        // Ensure we don't end up in an infinite loop if current == target
        if (currentScore !== targetScore) {
            const animateScore = setInterval(() => {
                if (currentScore < targetScore) currentScore++;
                else if (currentScore > targetScore) currentScore--;
                else clearInterval(animateScore);
                scoreValue.textContent = currentScore;
            }, 20);
        } else {
            scoreValue.textContent = targetScore;
        }

        // Handle Empty State
        if (userData.tasksCompleted === 0 && tasks.length === 0) {
            emptyStateAlert.style.display = 'flex';
        } else {
            emptyStateAlert.style.display = 'none';
        }

        // Save state
        DB.saveUser(currentUserEmail, userData);
        updateChart();
    }

    // ---- CHART.JS INTEGRATION ----
    let studyChart;
    function updateChart() {
        const ctx = document.getElementById('studyChart').getContext('2d');
        
        // Gradient for line
        const gradient = ctx.createLinearGradient(0, 0, 0, 300);
        gradient.addColorStop(0, 'rgba(157, 0, 255, 0.5)');
        gradient.addColorStop(1, 'rgba(157, 0, 255, 0.0)');

        const data = isNewUser && userData.tasksCompleted === 0 
            ? [0, 0, 0, 0, 0, 0, 0] 
            : userData.chartData;

        if (studyChart) studyChart.destroy();

        studyChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                datasets: [{
                    label: 'Study Hours',
                    data: data,
                    borderColor: '#9d00ff',
                    borderWidth: 3,
                    backgroundColor: gradient,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: '#00e1ff',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: { color: 'rgba(255,255,255,0.05)' },
                        ticks: { color: '#8b92a5' }
                    },
                    x: {
                        grid: { display: false },
                        ticks: { color: '#8b92a5' }
                    }
                }
            }
        });
    }

    // ---- TASK MANAGER ----
    const taskForm = document.getElementById('addTaskForm');
    const taskInput = document.getElementById('taskInput');
    const taskList = document.getElementById('taskList');

    function renderTasks() {
        taskList.innerHTML = '';
        if (tasks.length === 0) {
            taskList.innerHTML = '<p style="color:var(--text-muted); text-align:center; padding:20px;">No tasks yet. Add one above!</p>';
            return;
        }

        tasks.forEach((task, index) => {
            const div = document.createElement('div');
            div.className = `task-item ${task.completed ? 'completed' : ''}`;
            div.innerHTML = `
                <div class="task-checkbox" data-index="${index}">
                    <i class="fa-solid fa-check"></i>
                </div>
                <span class="task-title">${task.title}</span>
                <button class="task-delete" data-index="${index}"><i class="fa-solid fa-trash"></i></button>
            `;
            taskList.appendChild(div);
        });

        // Add Listeners
        document.querySelectorAll('.task-checkbox').forEach(box => {
            box.addEventListener('click', (e) => {
                const idx = e.currentTarget.dataset.index;
                tasks[idx].completed = !tasks[idx].completed;
                
                if (tasks[idx].completed) {
                    userData.tasksCompleted++;
                    // Simulate random chart data growth when completing tasks
                    userData.chartData = userData.chartData.map(h => h + (Math.random() * 0.5));
                    userData.attendanceRate = Math.min(100, userData.attendanceRate + 5);
                    if (userData.studyStreak === 0) userData.studyStreak = 1;
                } else {
                    userData.tasksCompleted = Math.max(0, userData.tasksCompleted - 1);
                }
                
                DB.saveTasks(currentUserEmail, tasks);
                renderTasks();
                updateDashboardUI();
            });
        });

        document.querySelectorAll('.task-delete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idx = e.currentTarget.dataset.index;
                
                // If we delete a completed task, optionally decrement stats. 
                // For this demo, we'll just remove it.
                if (tasks[idx].completed) {
                    userData.tasksCompleted = Math.max(0, userData.tasksCompleted - 1);
                }
                
                tasks.splice(idx, 1);
                DB.saveTasks(currentUserEmail, tasks);
                renderTasks();
                updateDashboardUI();
            });
        });
    }

    taskForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const title = taskInput.value.trim();
        if (title) {
            tasks.push({ title, completed: false, createdAt: new Date() });
            DB.saveTasks(currentUserEmail, tasks);
            taskInput.value = '';
            
            // If it's the very first task, remove empty state immediately
            if (isNewUser) {
                isNewUser = false;
            }
            
            renderTasks();
            updateDashboardUI();
        }
    });

    // Initial Render
    renderTasks();
    updateDashboardUI();

    // Logout
    document.getElementById('logoutBtn').addEventListener('click', (e) => {
        e.preventDefault();
        localStorage.removeItem('currentUser');
        localStorage.removeItem('currentRole');
        window.location.href = 'index.html';
    });
});
