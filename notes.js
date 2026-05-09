document.addEventListener('DOMContentLoaded', () => {
    // Mock Database for Notes (Simulating Firebase Firestore)
    const mockNotesDB = {
        "Mathematics": [
            {
                id: "math_ch1",
                chapterNumber: 1,
                chapterName: "Matrices",
                mentorName: "Prof. Sharma",
                uploadDate: "14 May 2026",
                pdfSize: "2.4 MB",
                pdfUrl: "#"
            }
        ],
        "Physics": [
            {
                id: "phy_ch3",
                chapterNumber: 3,
                chapterName: "Modern Physics",
                mentorName: "Prof. Mehta",
                uploadDate: "12 May 2026",
                pdfSize: "3.1 MB",
                pdfUrl: "#"
            }
        ],
        "Chemistry": [
            {
                id: "chem_ch5",
                chapterNumber: 5,
                chapterName: "Chemical Bonding",
                mentorName: "Prof. Iyer",
                uploadDate: "10 May 2026",
                pdfSize: "1.8 MB",
                pdfUrl: "#"
            }
        ],
        "Computer Science": [
            {
                id: "cs_ch2",
                chapterNumber: 2,
                chapterName: "Data Structures",
                mentorName: "Prof. Khan",
                uploadDate: "16 May 2026",
                pdfSize: "4.2 MB",
                pdfUrl: "#"
            }
        ]
    };

    const notesSubjectContainer = document.getElementById('notesSubjectContainer');
    const emptyStateNotes = document.getElementById('emptyStateNotes');
    const subjectFilter = document.getElementById('subjectFilter');
    const notesSearch = document.getElementById('notesSearch');

    // PDF Viewer Elements
    const pdfViewerModal = document.getElementById('pdfViewerModal');
    const closePdfBtn = document.getElementById('closePdfBtn');
    const pdfViewerTitle = document.getElementById('pdfViewerTitle');
    const pdfViewerMeta = document.getElementById('pdfViewerMeta');
    const mockPdfTitle = document.getElementById('mockPdfTitle');
    
    // Load Doubts from LocalStorage (Simulating Firestore Doubts Collection)
    function loadDoubts(noteId, container) {
        const doubts = JSON.parse(localStorage.getItem(`doubts_${noteId}`)) || [];
        container.innerHTML = '';

        if (doubts.length === 0) {
            container.innerHTML = `
                <div class="doubt-msg system-msg">
                    <p>No doubts yet. Ask your mentor about this chapter...</p>
                </div>
            `;
        }

        doubts.forEach(doubt => {
            appendDoubtMessage(doubt.text, doubt.sender, doubt.timestamp, container);
        });
    }

    function appendDoubtMessage(text, sender, timestamp, container) {
        // Remove system msg if it exists
        const systemMsg = container.querySelector('.system-msg');
        if (systemMsg) systemMsg.remove();

        const msgDiv = document.createElement('div');
        msgDiv.className = `doubt-msg ${sender === 'student' ? 'student-msg' : 'mentor-msg'}`;
        
        const timeStr = new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        msgDiv.innerHTML = `
            <div class="msg-bubble">
                <p>${text}</p>
                <span class="msg-time">${timeStr}</span>
            </div>
        `;
        container.appendChild(msgDiv);
        container.scrollTop = container.scrollHeight;
    }

    // Render Notes
    function renderNotes(filterSubject = 'all', searchQuery = '') {
        if (!notesSubjectContainer) return;
        notesSubjectContainer.innerHTML = '';
        let hasNotes = false;

        for (const [subject, notes] of Object.entries(mockNotesDB)) {
            if (filterSubject !== 'all' && subject !== filterSubject) continue;

            const filteredNotes = notes.filter(note => 
                note.chapterName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                `Chapter ${note.chapterNumber}`.toLowerCase().includes(searchQuery.toLowerCase())
            );

            if (filteredNotes.length === 0) continue;
            hasNotes = true;

            const subjectSection = document.createElement('div');
            subjectSection.className = 'notes-subject-section';
            
            const subjectHeader = document.createElement('h3');
            subjectHeader.className = 'subject-title';
            subjectHeader.innerHTML = `<i class="fa-solid fa-folder-open"></i> ${subject}`;
            subjectSection.appendChild(subjectHeader);

            const listContainer = document.createElement('div');
            listContainer.className = 'notes-list-container';

            filteredNotes.forEach(note => {
                const noteBlock = document.createElement('div');
                noteBlock.className = 'note-block';

                // Horizontal Card
                const card = document.createElement('div');
                card.className = 'note-card-horizontal glass-panel';
                card.innerHTML = `
                    <div class="note-card-left">
                        <div class="note-icon-large"><i class="fa-solid fa-file-pdf"></i></div>
                        <div class="note-card-info">
                            <span class="note-meta-badge">Chapter ${note.chapterNumber}</span>
                            <h4 class="note-title-horiz">${note.chapterName}</h4>
                            <div class="note-details-inline">
                                <span><i class="fa-solid fa-chalkboard-user"></i> Uploaded by: ${note.mentorName}</span>
                                <span><i class="fa-regular fa-calendar"></i> Uploaded: ${note.uploadDate}</span>
                                <span><i class="fa-solid fa-weight-hanging"></i> PDF Size: ${note.pdfSize}</span>
                            </div>
                        </div>
                    </div>
                    <div class="note-card-right">
                        <button class="btn-small outline view-pdf-btn" data-id="${note.id}">
                            <i class="fa-regular fa-eye"></i> View PDF
                        </button>
                        <button class="icon-btn download-btn tooltip" data-tip="Download">
                            <i class="fa-solid fa-download"></i>
                        </button>
                    </div>
                `;

                // AI Tools Bar
                const aiTools = document.createElement('div');
                aiTools.className = 'note-ai-tools';
                aiTools.innerHTML = `
                    <button class="btn-micro ai-btn"><i class="fa-solid fa-wand-magic-sparkles"></i> Summarize Chapter</button>
                    <button class="btn-micro ai-btn"><i class="fa-solid fa-star"></i> Important Questions</button>
                    <button class="btn-micro ai-btn"><i class="fa-solid fa-brain"></i> Explain Topic</button>
                `;

                // Doubt Panel (Below card)
                const doubtPanel = document.createElement('div');
                doubtPanel.className = 'inline-doubt-panel glass-panel';
                doubtPanel.innerHTML = `
                    <div class="inline-doubt-header">
                        <h4><i class="fa-solid fa-circle-question"></i> Ask doubt related to this chapter</h4>
                    </div>
                    <div class="inline-doubt-history" id="history_${note.id}"></div>
                    <div class="inline-doubt-input">
                        <textarea id="input_${note.id}" placeholder="Type your doubt here..." rows="2"></textarea>
                        <div class="inline-doubt-actions">
                            <button class="btn-small attach-btn"><i class="fa-solid fa-paperclip"></i> Attach Screenshot</button>
                            <button class="glow-btn send-doubt-inline" data-id="${note.id}">
                                <span><i class="fa-solid fa-paper-plane"></i> Send to Mentor</span>
                                <div class="btn-glow"></div>
                            </button>
                        </div>
                    </div>
                `;

                noteBlock.appendChild(card);
                noteBlock.appendChild(aiTools);
                noteBlock.appendChild(doubtPanel);
                listContainer.appendChild(noteBlock);
            });

            subjectSection.appendChild(listContainer);
            notesSubjectContainer.appendChild(subjectSection);
        }

        if (!hasNotes && emptyStateNotes) {
            emptyStateNotes.style.display = 'flex';
        } else if (emptyStateNotes) {
            emptyStateNotes.style.display = 'none';
        }

        // Initialize doubts for each rendered note
        document.querySelectorAll('.inline-doubt-panel').forEach(panel => {
            const historyContainer = panel.querySelector('.inline-doubt-history');
            if (historyContainer) {
                const noteId = historyContainer.id.split('_')[1];
                loadDoubts(noteId, historyContainer);
            }
        });

        // Event Listeners for new buttons
        document.querySelectorAll('.view-pdf-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const noteId = e.currentTarget.getAttribute('data-id');
                openPdfViewer(noteId);
            });
        });
        
        document.querySelectorAll('.send-doubt-inline').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const noteId = e.currentTarget.getAttribute('data-id');
                sendDoubt(noteId);
            });
        });

        document.querySelectorAll('.ai-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                alert('Gemini API Integration: Processing AI feature...');
            });
        });
    }

    function openPdfViewer(noteId) {
        if (!pdfViewerModal) return;
        let noteDetails = null;
        for (const notes of Object.values(mockNotesDB)) {
            const found = notes.find(n => n.id === noteId);
            if (found) {
                noteDetails = found;
                break;
            }
        }

        if (noteDetails) {
            if (pdfViewerTitle) pdfViewerTitle.textContent = \`Chapter \${noteDetails.chapterNumber} — \${noteDetails.chapterName}\`;
            if (pdfViewerMeta) pdfViewerMeta.textContent = \`Uploaded by \${noteDetails.mentorName} • \${noteDetails.uploadDate}\`;
            if (mockPdfTitle) mockPdfTitle.textContent = noteDetails.chapterName;
            
            pdfViewerModal.style.display = 'flex';
            setTimeout(() => {
                pdfViewerModal.classList.add('active');
            }, 10);
        }
    }

    function closePdfViewer() {
        if (!pdfViewerModal) return;
        pdfViewerModal.classList.remove('active');
        setTimeout(() => {
            pdfViewerModal.style.display = 'none';
        }, 300);
    }

    if (closePdfBtn) {
        closePdfBtn.addEventListener('click', closePdfViewer);
    }

    function sendDoubt(noteId) {
        const inputEl = document.getElementById(\`input_\${noteId}\`);
        const historyContainer = document.getElementById(\`history_\${noteId}\`);
        if (!inputEl || !historyContainer) return;

        const text = inputEl.value.trim();
        
        if (text) {
            const timestamp = new Date().getTime();
            
            // Save to local storage
            const doubts = JSON.parse(localStorage.getItem(\`doubts_\${noteId}\`)) || [];
            doubts.push({
                text: text,
                sender: 'student',
                timestamp: timestamp
            });
            localStorage.setItem(\`doubts_\${noteId}\`, JSON.stringify(doubts));
            
            // Update UI
            appendDoubtMessage(text, 'student', timestamp, historyContainer);
            inputEl.value = '';
            
            // Mock Mentor Auto-Reply
            setTimeout(() => {
                const replyText = "I have received your doubt. I will review this section and upload an explanation soon.";
                const replyTime = new Date().getTime();
                
                const updatedDoubts = JSON.parse(localStorage.getItem(\`doubts_\${noteId}\`)) || [];
                updatedDoubts.push({
                    text: replyText,
                    sender: 'mentor',
                    timestamp: replyTime
                });
                localStorage.setItem(\`doubts_\${noteId}\`, JSON.stringify(updatedDoubts));
                
                appendDoubtMessage(replyText, 'mentor', replyTime, historyContainer);
            }, 3000);
        }
    }

    // Filters and Search
    if (subjectFilter) {
        subjectFilter.addEventListener('change', (e) => {
            renderNotes(e.target.value, notesSearch ? notesSearch.value : '');
        });
    }

    if (notesSearch) {
        notesSearch.addEventListener('input', (e) => {
            renderNotes(subjectFilter ? subjectFilter.value : 'all', e.target.value);
        });
    }

    // Initial Render
    renderNotes();
});
