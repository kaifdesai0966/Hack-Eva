document.addEventListener("DOMContentLoaded", () => {
    // Canvas Particle Network
    const canvas = document.getElementById("particle-canvas");
    const ctx = canvas.getContext("2d");

    let width, height;
    let particles = [];

    function initCanvas() {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
    }

    window.addEventListener("resize", () => {
        initCanvas();
        createParticles();
    });

    class Particle {
        constructor() {
            this.x = Math.random() * width;
            this.y = Math.random() * height;
            this.vx = (Math.random() - 0.5) * 0.5;
            this.vy = (Math.random() - 0.5) * 0.5;
            this.radius = Math.random() * 1.5 + 0.5;
        }

        update() {
            this.x += this.vx;
            this.y += this.vy;

            if (this.x < 0 || this.x > width) this.vx = -this.vx;
            if (this.y < 0 || this.y > height) this.vy = -this.vy;
        }

        draw() {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
            ctx.fill();
        }
    }

    function createParticles() {
        particles = [];
        const numParticles = Math.floor((width * height) / 15000);
        for (let i = 0; i < numParticles; i++) {
            particles.push(new Particle());
        }
    }

    function animate() {
        ctx.clearRect(0, 0, width, height);

        for (let i = 0; i < particles.length; i++) {
            particles[i].update();
            particles[i].draw();

            for (let j = i + 1; j < particles.length; j++) {
                const dx = particles[i].x - particles[j].x;
                const dy = particles[i].y - particles[j].y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < 120) {
                    ctx.beginPath();
                    ctx.strokeStyle = `rgba(157, 0, 255, ${0.2 - distance / 600})`;
                    ctx.lineWidth = 0.5;
                    ctx.moveTo(particles[i].x, particles[i].y);
                    ctx.lineTo(particles[j].x, particles[j].y);
                    ctx.stroke();
                }
            }
        }

        requestAnimationFrame(animate);
    }

    initCanvas();
    createParticles();
    animate();

    // Smooth scroll for nav links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            document.querySelector(this.getAttribute('href')).scrollIntoView({
                behavior: 'smooth'
            });
        });
    });

    // Authentication Modal Logic
    const authBtns = document.querySelectorAll('.open-auth-btn');
    const authOverlay = document.getElementById('authOverlay');
    const closeAuth = document.getElementById('closeAuth');
    const roleCards = document.querySelectorAll('.role-card');
    const loginForm = document.getElementById('loginForm');
    const togglePw = document.querySelector('.toggle-pw');

    if (authOverlay && closeAuth) {
        authBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                authOverlay.classList.add('active');
                document.body.style.overflow = 'hidden'; // Prevent scrolling
            });
        });

        closeAuth.addEventListener('click', () => {
            authOverlay.classList.remove('active');
            document.body.style.overflow = '';
        });

        // Close when clicking outside the card
        authOverlay.addEventListener('click', (e) => {
            if (e.target.classList.contains('auth-backdrop')) {
                authOverlay.classList.remove('active');
                document.body.style.overflow = '';
            }
        });
    }

    // Role Selection
    roleCards.forEach(card => {
        card.addEventListener('click', () => {
            roleCards.forEach(c => c.classList.remove('active'));
            card.classList.add('active');
        });
    });

    // Password Toggle
    if (togglePw) {
        togglePw.addEventListener('click', function () {
            const input = this.previousElementSibling;
            if (input.type === 'password') {
                input.type = 'text';
                this.classList.remove('fa-eye-slash');
                this.classList.add('fa-eye');
            } else {
                input.type = 'password';
                this.classList.remove('fa-eye');
                this.classList.add('fa-eye-slash');
            }
        });
    }

    // Form Submission
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const activeRole = document.querySelector('.role-card.active').dataset.role;
            const emailInput = loginForm.querySelector('input[type="email"]').value;

            // Simulate login processing
            const btn = loginForm.querySelector('.neon-btn span');
            const originalText = btn.textContent;
            btn.textContent = 'Authenticating...';

            setTimeout(() => {
                // Set local session to mock DB authentication
                localStorage.setItem('currentUser', emailInput);
                localStorage.setItem('currentRole', activeRole);

                if (activeRole === 'student') {
                    window.location.href = 'dashboard.html';
                } else {
                    window.location.href = 'mentor-dashboard.html';
                }
            }, 1000);
        });
    }
});
