document.addEventListener("DOMContentLoaded", () => {
    // ---- AUTHENTICATION CHECK ----
    const currentUserEmail = localStorage.getItem('currentUser');
    if (!currentUserEmail) {
        window.location.href = 'index.html';
        return;
    }

    const userData = JSON.parse(localStorage.getItem(`user_${currentUserEmail}`));
    if (userData) {
        const avatarEl = document.getElementById('userAvatar');
        if (avatarEl) {
            avatarEl.src = `https://ui-avatars.com/api/?name=${userData.name}&background=9d00ff&color=fff`;
        }
    }

    // ---- DATABASE SIMULATION LAYER ----
    const DB = {
        getAssignments: () => {
            const raw = localStorage.getItem('global_assignments');
            if (!raw) {
                // Initialize with some mock data if empty to show the premium UI
                const mockAssignments = [
                    {
                        id: 'a1',
                        title: 'Data Structures Final Project',
                        subject: 'Computer Science',
                        mentor: 'Prof. Sharma',
                        assignedDate: new Date(Date.now() - 86400000 * 2).toISOString(),
                        dueDate: new Date(Date.now() + 86400000 * 5).toISOString(),
                        description: 'Implement a balanced AVL tree and write a 5-page report on its time complexity compared to standard Binary Search Trees. Ensure your code is thoroughly commented.',
                        resources: [{ name: 'AVL_Tree_Notes.pdf', type: 'pdf' }, { name: 'Starter_Code.zip', type: 'zip' }],
                        priority: 'High'
                    },
                    {
                        id: 'a2',
                        title: 'Quantum Mechanics Problem Set',
                        subject: 'Physics',
                        mentor: 'Dr. Verma',
                        assignedDate: new Date(Date.now() - 86400000 * 5).toISOString(),
                        dueDate: new Date(Date.now() - 86400000 * 1).toISOString(), // Overdue
                        description: 'Solve problems 1-15 from Chapter 4. Pay special attention to the Schrödinger equation derivations.',
                        resources: [{ name: 'Chapter4_Formulas.pdf', type: 'pdf' }],
                        priority: 'Medium'
                    },
                    {
                        id: 'a3',
                        title: 'Linear Algebra Matrices Worksheet',
                        subject: 'Mathematics',
                        mentor: 'Prof. Gupta',
                        assignedDate: new Date(Date.now() - 86400000 * 1).toISOString(),
                        dueDate: new Date(Date.now() + 86400000 * 2).toISOString(),
                        description: 'Complete the attached worksheet on Eigenvalues and Eigenvectors.',
                        resources: [{ name: 'Matrices_Worksheet.pdf', type: 'pdf' }],
                        priority: 'Low'
                    }
                ];
                localStorage.setItem('global_assignments', JSON.stringify(mockAssignments));
                return mockAssignments;
            }
            return JSON.parse(raw);
        },
        getSubmissions: (email) => {
            return JSON.parse(localStorage.getItem(`submissions_${email}`)) || {};
        },
        saveSubmission: (email, assignmentId, data) => {
            const subs = JSON.parse(localStorage.getItem(`submissions_${email}`)) || {};
            subs[assignmentId] = data;
            localStorage.setItem(`submissions_${email}`, JSON.stringify(subs));
        },
        removeSubmission: (email, assignmentId) => {
            const subs = JSON.parse(localStorage.getItem(`submissions_${email}`)) || {};
            delete subs[assignmentId];
            localStorage.setItem(`submissions_${email}`, JSON.stringify(subs));
        }
    };

    // State
    const assignments = DB.getAssignments();
    const submissions = DB.getSubmissions(currentUserEmail);
    let currentFilter = 'all';
    let currentSearch = '';
    let selectedAssignmentId = null;

    // Elements
    const gridEl = document.getElementById('assignmentsGrid');
    const emptyStateEl = document.getElementById('emptyStateAssignments');
    const filterEl = document.getElementById('assignmentFilter');
    const searchEl = document.getElementById('assignmentSearch');

    // Views
    const listView = document.getElementById('assignmentsListView');
    const detailsView = document.getElementById('assignmentDetailsView');
    const backBtn = document.getElementById('backToAssignmentsBtn');

    // Details Elements
    const dTitle = document.getElementById('detailTitle');
    const dSubject = document.getElementById('detailSubject');
    const dMentor = document.getElementById('detailMentor');
    const dDueDate = document.getElementById('detailDueDate');
    const dTimeRemaining = document.getElementById('detailTimeRemaining');
    const dStatusBadge = document.getElementById('detailStatusBadge');
    const dDescription = document.getElementById('detailDescription');
    const dResources = document.getElementById('detailResources');
    const deadlineBox = document.getElementById('deadlineBox');

    // Submission Elements
    const uploadZone = document.getElementById('uploadZone');
    const fileInput = document.getElementById('fileInput');
    const filePreview = document.getElementById('filePreview');
    const previewFileName = document.getElementById('previewFileName');
    const removeFileBtn = document.getElementById('removeFileBtn');
    const submitBtn = document.getElementById('submitAssignmentBtn');
    const submissionPanel = document.getElementById('submissionPanel');
    const successPanel = document.getElementById('submissionSuccessPanel');
    const submissionTimestamp = document.getElementById('submissionTimestamp');
    const undoBtn = document.getElementById('undoSubmissionBtn');

    let selectedFile = null;

    // ---- RENDER LOGIC ----

    function getStatusInfo(assignment) {
        const sub = submissions[assignment.id];
        if (sub) {
            return { status: 'submitted', label: 'Submitted', class: 'status-green' };
        }
        const now = new Date();
        const due = new Date(assignment.dueDate);
        if (now > due) {
            return { status: 'overdue', label: 'Overdue', class: 'status-red' };
        }
        return { status: 'pending', label: 'Pending', class: 'status-yellow' };
    }

    function formatTimeRemaining(dueDateStr) {
        const now = new Date();
        const due = new Date(dueDateStr);
        const diffMs = due - now;

        if (diffMs < 0) return 'Deadline passed';

        const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

        if (days > 0) return `${days}d ${hours}h left`;
        if (hours > 0) return `${hours} hours left`;
        return 'Less than an hour left';
    }

    function formatDate(dateStr) {
        const options = { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' };
        return new Date(dateStr).toLocaleDateString('en-US', options);
    }

    function renderGrid() {
        gridEl.innerHTML = '';
        
        const filtered = assignments.filter(a => {
            const statusInfo = getStatusInfo(a);
            const matchesFilter = currentFilter === 'all' || statusInfo.status === currentFilter;
            const searchLower = currentSearch.toLowerCase();
            const matchesSearch = a.title.toLowerCase().includes(searchLower) || a.subject.toLowerCase().includes(searchLower);
            return matchesFilter && matchesSearch;
        });

        if (filtered.length === 0) {
            gridEl.style.display = 'none';
            emptyStateEl.style.display = 'flex';
        } else {
            gridEl.style.display = 'grid';
            emptyStateEl.style.display = 'none';

            filtered.forEach(a => {
                const statusInfo = getStatusInfo(a);
                const hasAttachment = a.resources && a.resources.length > 0;
                const timeStr = formatTimeRemaining(a.dueDate);
                const isOverdue = statusInfo.status === 'overdue';

                const card = document.createElement('div');
                card.className = `assignment-card glass-panel ${isOverdue ? 'overdue-glow' : ''}`;
                card.innerHTML = `
                    <div class="card-header">
                        <span class="subject-tag">${a.subject}</span>
                        <div class="status-badge ${statusInfo.class}">${statusInfo.label}</div>
                    </div>
                    <div class="card-body">
                        <h3>${a.title}</h3>
                        <p class="mentor-name"><i class="fa-solid fa-chalkboard-user"></i> ${a.mentor}</p>
                        
                        <div class="date-info">
                            <div class="date-row">
                                <span class="label">Assigned:</span>
                                <span>${new Date(a.assignedDate).toLocaleDateString()}</span>
                            </div>
                            <div class="date-row due-row ${isOverdue ? 'text-danger' : ''}">
                                <span class="label">Due:</span>
                                <span>${formatDate(a.dueDate)}</span>
                            </div>
                        </div>
                    </div>
                    <div class="card-footer">
                        <div class="time-left ${isOverdue ? 'text-danger' : 'glow-text'}">
                            <i class="fa-regular fa-clock"></i> ${timeStr}
                        </div>
                        <div class="icons">
                            ${hasAttachment ? '<i class="fa-solid fa-paperclip res-icon-small"></i>' : ''}
                        </div>
                    </div>
                `;
                
                card.addEventListener('click', () => openDetails(a));
                gridEl.appendChild(card);
            });
        }
    }

    // ---- DETAILS VIEW LOGIC ----

    function openDetails(assignment) {
        selectedAssignmentId = assignment.id;
        
        // Populate Data
        dTitle.textContent = assignment.title;
        dSubject.textContent = assignment.subject;
        dMentor.textContent = assignment.mentor;
        dDueDate.textContent = formatDate(assignment.dueDate);
        dTimeRemaining.textContent = formatTimeRemaining(assignment.dueDate);
        dDescription.innerHTML = `<p>${assignment.description}</p>`;

        const statusInfo = getStatusInfo(assignment);
        dStatusBadge.textContent = statusInfo.label;
        dStatusBadge.className = `details-status-badge ${statusInfo.class}`;

        if (statusInfo.status === 'overdue') {
            deadlineBox.classList.add('overdue');
            dTimeRemaining.classList.remove('glow-text');
            dTimeRemaining.classList.add('text-danger');
        } else {
            deadlineBox.classList.remove('overdue');
            dTimeRemaining.classList.add('glow-text');
            dTimeRemaining.classList.remove('text-danger');
        }

        // Resources
        dResources.innerHTML = '';
        if (assignment.resources && assignment.resources.length > 0) {
            assignment.resources.forEach(res => {
                const iconClass = res.type === 'pdf' ? 'fa-file-pdf' : 'fa-file-zipper';
                const div = document.createElement('div');
                div.className = 'resource-item glass-panel';
                div.innerHTML = `
                    <div class="res-icon"><i class="fa-solid ${iconClass}"></i></div>
                    <div class="res-info">
                        <h4>${res.name}</h4>
                    </div>
                    <button class="btn-small outline download-btn"><i class="fa-solid fa-download"></i></button>
                `;
                dResources.appendChild(div);
            });
        } else {
            dResources.innerHTML = '<p class="text-muted">No resources attached.</p>';
        }

        // Submission State
        resetSubmissionPanel();
        if (statusInfo.status === 'submitted') {
            showSuccessPanel(submissions[assignment.id]);
        } else {
            showUploadPanel();
        }

        // Transition
        listView.style.display = 'none';
        detailsView.style.display = 'block';
        window.scrollTo(0, 0);
    }

    backBtn.addEventListener('click', () => {
        detailsView.style.display = 'none';
        listView.style.display = 'block';
        renderGrid(); // Re-render to update statuses if changed
    });

    // ---- SUBMISSION LOGIC ----

    function resetSubmissionPanel() {
        selectedFile = null;
        fileInput.value = '';
        filePreview.style.display = 'none';
        uploadZone.style.display = 'block';
        submitBtn.disabled = true;
    }

    function showUploadPanel() {
        submissionPanel.style.display = 'block';
        successPanel.style.display = 'none';
    }

    function showSuccessPanel(subData) {
        submissionPanel.style.display = 'none';
        successPanel.style.display = 'flex';
        submissionTimestamp.textContent = new Date(subData.timestamp).toLocaleString();
    }

    // Drag & Drop
    uploadZone.addEventListener('click', () => fileInput.click());
    
    uploadZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadZone.classList.add('dragover');
    });
    
    uploadZone.addEventListener('dragleave', () => {
        uploadZone.classList.remove('dragover');
    });

    uploadZone.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadZone.classList.remove('dragover');
        if (e.dataTransfer.files.length > 0) {
            handleFileSelect(e.dataTransfer.files[0]);
        }
    });

    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFileSelect(e.target.files[0]);
        }
    });

    function handleFileSelect(file) {
        selectedFile = file;
        previewFileName.textContent = file.name;
        uploadZone.style.display = 'none';
        filePreview.style.display = 'flex';
        submitBtn.disabled = false;
    }

    removeFileBtn.addEventListener('click', () => {
        resetSubmissionPanel();
    });

    submitBtn.addEventListener('click', () => {
        if (!selectedFile || !selectedAssignmentId) return;

        // Simulate upload delay
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<span><i class="fa-solid fa-spinner fa-spin"></i> Uploading...</span><div class="btn-glow"></div>';
        submitBtn.disabled = true;

        setTimeout(() => {
            const subData = {
                timestamp: new Date().toISOString(),
                fileName: selectedFile.name
            };
            
            DB.saveSubmission(currentUserEmail, selectedAssignmentId, subData);
            submissions[selectedAssignmentId] = subData;
            
            // Update UI
            dStatusBadge.textContent = 'Submitted';
            dStatusBadge.className = 'details-status-badge status-green';
            showSuccessPanel(subData);
            
            submitBtn.innerHTML = originalText;
            
            // Update User tasks logic (optional, tying into dashboard stats)
            if (userData) {
                userData.tasksCompleted = (userData.tasksCompleted || 0) + 1;
                localStorage.setItem(`user_${currentUserEmail}`, JSON.stringify(userData));
            }
            
        }, 1500);
    });

    undoBtn.addEventListener('click', () => {
        DB.removeSubmission(currentUserEmail, selectedAssignmentId);
        delete submissions[selectedAssignmentId];
        
        const assignment = assignments.find(a => a.id === selectedAssignmentId);
        const statusInfo = getStatusInfo(assignment);
        
        dStatusBadge.textContent = statusInfo.label;
        dStatusBadge.className = `details-status-badge ${statusInfo.class}`;
        
        resetSubmissionPanel();
        showUploadPanel();

        if (userData && userData.tasksCompleted > 0) {
            userData.tasksCompleted--;
            localStorage.setItem(`user_${currentUserEmail}`, JSON.stringify(userData));
        }
    });

    // ---- EVENT LISTENERS ----
    filterEl.addEventListener('change', (e) => {
        currentFilter = e.target.value;
        renderGrid();
    });

    searchEl.addEventListener('input', (e) => {
        currentSearch = e.target.value;
        renderGrid();
    });

    // Init
    renderGrid();
});
