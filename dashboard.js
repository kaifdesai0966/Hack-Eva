document.addEventListener("DOMContentLoaded", () => {
    // ---- DATABASE SIMULATION LAYER ----
    const DB = {
        getUser: (email) => JSON.parse(localStorage.getItem(`user_${email}`)),
        saveUser: (email, data) => localStorage.setItem(`user_${email}`, JSON.stringify(data)),
        getTasks: (email) => JSON.parse(localStorage.getItem(`tasks_${email}`)) || [],
        saveTasks: (email, tasks) => localStorage.setItem(`tasks_${email}`, JSON.stringify(tasks))
    };

    // ---- AUTHENTICATION CHECK ----
    const currentUserEmail = localStorage.getItem('currentUser');
    if (!currentUserEmail) {
        window.location.href = 'index.html';
        return;
    }

    // Initialize/Fetch User Data
    let userData = DB.getUser(currentUserEmail);
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
            joinDate: new Date().toISOString(),
            chartData: [0, 0, 0, 0, 0, 0, 0],
            subjects: [
                { name: 'Mathematics', progress: 0, color: '#9d00ff' },
                { name: 'Physics', progress: 0, color: '#00e1ff' },
                { name: 'Computer Science', progress: 0, color: '#00ff88' },
                { name: 'Chemistry', progress: 0, color: '#ffaa00' },
                { name: 'English', progress: 0, color: '#ff3366' }
            ]
        };
        DB.saveUser(currentUserEmail, userData);
    }

    // Ensure subjects array exists for old mock users who didn't have it
    if (!userData.subjects) {
        userData.subjects = [
            { name: 'Mathematics', progress: Math.min(userData.tasksCompleted * 2, 100), color: '#9d00ff' },
            { name: 'Physics', progress: Math.min(userData.tasksCompleted * 1.5, 100), color: '#00e1ff' },
            { name: 'Computer Science', progress: Math.min(userData.tasksCompleted * 3, 100), color: '#00ff88' },
            { name: 'Chemistry', progress: Math.min(userData.tasksCompleted * 1, 100), color: '#ffaa00' },
            { name: 'English', progress: Math.min(userData.tasksCompleted * 0.5, 100), color: '#ff3366' }
        ];
    }

    let tasks = DB.getTasks(currentUserEmail);

    // ---- UI POPULATION ----
    document.getElementById('userName').textContent = userData.name;
    document.getElementById('welcomeMessage').textContent = `Welcome, ${userData.name} 👋`;
    document.getElementById('navStreak').textContent = userData.studyStreak;
    document.getElementById('userAvatar').src = `https://ui-avatars.com/api/?name=${userData.name}&background=9d00ff&color=fff`;

    const emptyStateAlert = document.getElementById('emptyStateAlert');
    const tasksCompletedEl = document.getElementById('tasksCompletedValue');
    const streakEl = document.getElementById('streakValue');
    const subjectsList = document.getElementById('subjectsList');
    const aiStudyInsights = document.getElementById('aiStudyInsights');

    function updateDashboardUI() {
        // Calculate Score purely based on tasks & streaks (Max 100)
        const maxTasksForScore = 30;
        let score = Math.min((userData.tasksCompleted / maxTasksForScore) * 100, 100);
        if (userData.tasksCompleted === 0) score = 0;
        userData.productivityScore = Math.round(score);
        
        // Update Stats
        tasksCompletedEl.textContent = userData.tasksCompleted;
        streakEl.textContent = userData.studyStreak;

        // Animate Ring
        const ring = document.getElementById('scoreRing');
        const scoreValue = document.getElementById('scoreValue');
        const circumference = 2 * Math.PI * 52;
        
        let currentScore = parseInt(scoreValue.textContent) || 0;
        const targetScore = userData.productivityScore;
        const offset = circumference - (targetScore / 100) * circumference;
        ring.style.strokeDashoffset = offset;

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

        // Render Subjects
        renderSubjects();

        // Generate AI Insight based on productivity
        generateAIInsight();

        DB.saveUser(currentUserEmail, userData);
        updateChart();
    }

    function renderSubjects() {
        subjectsList.innerHTML = '';
        userData.subjects.forEach(sub => {
            const div = document.createElement('div');
            div.className = 'subject-item';
            div.innerHTML = `
                <div class="subject-header">
                    <span>${sub.name}</span>
                    <span>${Math.round(sub.progress)}%</span>
                </div>
                <div class="progress-bar-bg">
                    <div class="progress-bar-fg" style="width: ${sub.progress}%; background-color: ${sub.color}; box-shadow: 0 0 10px ${sub.color};"></div>
                </div>
            `;
            subjectsList.appendChild(div);
        });
    }

    function generateAIInsight() {
        // Wipe all but the first welcome message
        while(aiStudyInsights.children.length > 1) {
            aiStudyInsights.removeChild(aiStudyInsights.lastChild);
        }

        if (userData.tasksCompleted > 0) {
            const div = document.createElement('div');
            div.className = 'ai-message';
            
            let msgText = '';
            if (userData.productivityScore < 30) {
                msgText = `Great start! Try completing 2 more tasks today to boost your productivity score above 30%.`;
            } else if (userData.productivityScore < 70) {
                msgText = `You're on fire! 🔥 Keep your streak going. Focus on completing more subjects today to raise your progress bars!`;
            } else {
                msgText = `Incredible productivity! You are currently in the top 5% of active remote learners this week. Maintain this pace!`;
            }

            div.innerHTML = `
                <img src="https://ui-avatars.com/api/?name=AI&background=00e1ff&color=fff" alt="AI">
                <div class="msg-content">
                    <p>${msgText}</p>
                </div>
            `;
            aiStudyInsights.appendChild(div);
            // scroll to bottom
            aiStudyInsights.scrollTop = aiStudyInsights.scrollHeight;
        }
    }

    // ---- CHART.JS INTEGRATION ----
    let studyChart;
    function updateChart() {
        const ctx = document.getElementById('studyChart').getContext('2d');
        const gradient = ctx.createLinearGradient(0, 0, 0, 300);
        gradient.addColorStop(0, 'rgba(157, 0, 255, 0.5)');
        gradient.addColorStop(1, 'rgba(157, 0, 255, 0.0)');

        const data = (userData.tasksCompleted === 0) ? [0,0,0,0,0,0,0] : userData.chartData;

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
                    y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#8b92a5' } },
                    x: { grid: { display: false }, ticks: { color: '#8b92a5' } }
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
            taskList.innerHTML = '<p style="color:var(--text-muted); text-align:center; padding:20px;">No pending tasks. Add one above!</p>';
            return;
        }

        tasks.forEach((task, index) => {
            const div = document.createElement('div');
            div.className = `task-item ${task.completed ? 'completed' : ''}`;
            div.innerHTML = `
                <div class="task-checkbox" data-index="${index}"><i class="fa-solid fa-check"></i></div>
                <span class="task-title">${task.title}</span>
                <button class="task-delete" data-index="${index}"><i class="fa-solid fa-trash"></i></button>
            `;
            taskList.appendChild(div);
        });

        document.querySelectorAll('.task-checkbox').forEach(box => {
            box.addEventListener('click', (e) => {
                const idx = e.currentTarget.dataset.index;
                tasks[idx].completed = !tasks[idx].completed;
                
                if (tasks[idx].completed) {
                    userData.tasksCompleted++;
                    userData.chartData = userData.chartData.map(h => h + (Math.random() * 0.5));
                    if (userData.studyStreak === 0) userData.studyStreak = 1;

                    // Boost random subject progress
                    const randSub = Math.floor(Math.random() * userData.subjects.length);
                    userData.subjects[randSub].progress = Math.min(100, userData.subjects[randSub].progress + (Math.random() * 10 + 5));

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
            renderTasks();
            updateDashboardUI();
        }
    });

    renderTasks();
    updateDashboardUI();

    document.getElementById('logoutBtn').addEventListener('click', (e) => {
        e.preventDefault();
        localStorage.removeItem('currentUser');
        localStorage.removeItem('currentRole');
        window.location.href = 'index.html';
    });
});
