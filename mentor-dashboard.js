document.addEventListener("DOMContentLoaded", () => {
    // ---- AUTHENTICATION CHECK ----
    const currentUserEmail = localStorage.getItem('currentUser');
    const currentRole = localStorage.getItem('currentRole');

    if (!currentUserEmail || currentRole !== 'mentor') {
        window.location.href = 'index.html'; // Redirect to login if not authenticated as mentor
        return;
    }

    // Initialize Mentor User Data if first time
    let mentorData = JSON.parse(localStorage.getItem(`user_${currentUserEmail}`));
    if (!mentorData) {
        mentorData = {
            name: currentUserEmail.split('@')[0],
            email: currentUserEmail,
            role: 'mentor',
            joinDate: new Date().toISOString()
        };
        localStorage.setItem(`user_${currentUserEmail}`, JSON.stringify(mentorData));
    }

    document.getElementById('userName').textContent = `Prof. ${mentorData.name}`;
    document.getElementById('welcomeMessage').textContent = `Welcome, Prof. ${mentorData.name} 👋`;
    document.getElementById('userAvatar').src = `https://ui-avatars.com/api/?name=${mentorData.name}&background=00e1ff&color=fff`;

    // ---- DATA AGGREGATION FROM STUDENTS ----
    // In our mock DB, we scan localStorage for all users with role 'student'
    let students = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith('user_')) {
            try {
                const userObj = JSON.parse(localStorage.getItem(key));
                if (userObj.role === 'student') {
                    students.push(userObj);
                }
            } catch (e) { }
        }
    }

    // Elements
    const emptyStateAlert = document.getElementById('emptyStateAlert');
    const totalStudentsEl = document.getElementById('totalStudentsValue');
    const activeStudentsNavEl = document.getElementById('activeStudentsNav');
    const activeStreaksEl = document.getElementById('activeStreaksValue');
    const classProductivityEl = document.getElementById('classProductivityValue');
    const classStatusTrendEl = document.getElementById('classStatusTrend');
    const taskRateValueEl = document.getElementById('taskRateValue');
    const taskRateRing = document.getElementById('taskRateRing');
    const studentTableBody = document.getElementById('studentTableBody');
    const aiInsightsList = document.getElementById('aiInsightsList');

    function updateMentorDashboard() {
        if (students.length === 0) {
            emptyStateAlert.style.display = 'flex';
            renderEmptyChart();
            return;
        } else {
            emptyStateAlert.style.display = 'none';
        }

        // Calculate Aggregates
        const totalStudents = students.length;
        let totalScore = 0;
        let activeStreaks = 0;
        let totalTasks = 0; // rough proxy for rate

        let atRiskCount = 0;
        let highPerformersCount = 0;

        let aggregatedChartData = [0, 0, 0, 0, 0, 0, 0];

        students.forEach(s => {
            totalScore += (s.productivityScore || 0);
            if ((s.studyStreak || 0) > 0) activeStreaks++;
            totalTasks += (s.tasksCompleted || 0);

            if ((s.productivityScore || 0) < 40) atRiskCount++;
            if ((s.productivityScore || 0) > 80) highPerformersCount++;

            if (s.chartData && s.chartData.length === 7) {
                for (let i = 0; i < 7; i++) {
                    aggregatedChartData[i] += s.chartData[i];
                }
            }
        });

        const avgScore = Math.round(totalScore / totalStudents);
        // Let's proxy task completion rate as average tasks out of an expected 20 per student
        const expectedTotalTasks = totalStudents * 20;
        let taskCompletionRate = Math.round((totalTasks / expectedTotalTasks) * 100);
        taskCompletionRate = Math.min(taskCompletionRate, 100); // cap at 100

        // Update DOM
        totalStudentsEl.textContent = totalStudents;
        activeStudentsNavEl.textContent = totalStudents;
        activeStreaksEl.textContent = activeStreaks;
        classProductivityEl.textContent = `${avgScore}%`;

        if (avgScore > 75) {
            classStatusTrendEl.className = 'trend positive';
            classStatusTrendEl.innerHTML = '<i class="fa-solid fa-arrow-up"></i> Excellent';
        } else if (avgScore < 40) {
            classStatusTrendEl.className = 'trend negative';
            classStatusTrendEl.innerHTML = '<i class="fa-solid fa-arrow-down"></i> Needs Attention';
            classStatusTrendEl.style.background = 'rgba(255, 51, 102, 0.1)';
            classStatusTrendEl.style.color = 'var(--danger)';
        } else {
            classStatusTrendEl.className = 'trend';
            classStatusTrendEl.innerHTML = '<i class="fa-solid fa-minus"></i> Stable';
            classStatusTrendEl.style.background = 'rgba(255, 170, 0, 0.1)';
            classStatusTrendEl.style.color = 'var(--warning)';
        }

        // Animate Task Rate Ring
        const circumference = 2 * Math.PI * 44; // r=44
        const offset = circumference - (taskCompletionRate / 100) * circumference;
        taskRateRing.style.strokeDashoffset = offset;
        taskRateValueEl.textContent = taskCompletionRate;

        // Populate Student Table
        studentTableBody.innerHTML = '';
        students.sort((a, b) => (b.productivityScore || 0) - (a.productivityScore || 0)).forEach(s => {
            const score = s.productivityScore || 0;
            let statusClass = 'status-yellow';
            let statusText = 'Moderate';

            if (score >= 70) { statusClass = 'status-green'; statusText = 'Active'; }
            else if (score < 40) { statusClass = 'status-red'; statusText = 'At Risk'; }

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>
                    <div class="student-name-cell">
                        <img src="https://ui-avatars.com/api/?name=${s.name}&background=random" alt="${s.name}">
                        ${s.name}
                    </div>
                </td>
                <td><strong>${score}%</strong></td>
                <td>${s.tasksCompleted || 0}</td>
                <td>${s.studyStreak || 0} days <i class="fa-solid fa-fire" style="color:var(--warning);font-size:0.8rem;"></i></td>
                <td><span class="status-badge ${statusClass}">${statusText}</span></td>
            `;
            studentTableBody.appendChild(tr);
        });

        // Generate AI Insights
        aiInsightsList.innerHTML = '';
        const insights = [];

        if (atRiskCount > 0) {
            insights.push(`<div class="insight-item warning"><strong>Warning:</strong> ${atRiskCount} student(s) are showing critically low productivity scores. Consider reaching out.</div>`);
        }
        if (highPerformersCount > 0) {
            insights.push(`<div class="insight-item positive"><strong>Success:</strong> ${highPerformersCount} student(s) are performing exceptionally well.</div>`);
        }
        if (activeStreaks < totalStudents / 2) {
            insights.push(`<div class="insight-item"><strong>Insight:</strong> Class engagement is dipping. Less than half your students have an active streak. A new assignment might boost activity.</div>`);
        }
        if (taskCompletionRate > 80) {
            insights.push(`<div class="insight-item positive"><strong>Excellent:</strong> Overall task completion rate is high. Your current curriculum pacing is perfect.</div>`);
        }

        if (insights.length === 0) {
            insights.push(`<div class="insight-item">Class is stable. Monitor productivity trends closely.</div>`);
        }

        aiInsightsList.innerHTML = insights.join('');

        // Render Chart
        renderChart(aggregatedChartData);
    }

    // ---- CHART.JS INTEGRATION ----
    let trendChart;
    function renderChart(data) {
        const ctx = document.getElementById('classTrendChart').getContext('2d');

        const gradient = ctx.createLinearGradient(0, 0, 0, 300);
        gradient.addColorStop(0, 'rgba(0, 225, 255, 0.5)');
        gradient.addColorStop(1, 'rgba(0, 225, 255, 0.0)');

        if (trendChart) trendChart.destroy();

        trendChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                datasets: [{
                    label: 'Total Class Study Hours',
                    data: data,
                    borderColor: '#00e1ff',
                    borderWidth: 3,
                    backgroundColor: gradient,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: '#9d00ff',
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

    function renderEmptyChart() {
        renderChart([0, 0, 0, 0, 0, 0, 0]);
    }

    // Run Updates
    updateMentorDashboard();

    // Logout
    document.getElementById('logoutBtn').addEventListener('click', (e) => {
        e.preventDefault();
        localStorage.removeItem('currentUser');
        localStorage.removeItem('currentRole');
        window.location.href = 'index.html';
    });
});
