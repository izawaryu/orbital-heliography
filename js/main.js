document.addEventListener('DOMContentLoaded', () => {
  // --- MOBILE NAV TOGGLE ---
  const hamburger = document.querySelector('.hamburger');
  const navLinksList = document.querySelector('.nav-links');
  const navLinks = document.querySelectorAll('.nav-link');

  if (hamburger && navLinksList) {
    hamburger.addEventListener('click', () => {
      hamburger.classList.toggle('open');
      navLinksList.classList.toggle('open');
      const expanded = hamburger.classList.contains('open');
      hamburger.setAttribute('aria-expanded', expanded);
    });

    navLinks.forEach(link => {
      link.addEventListener('click', () => {
        hamburger.classList.remove('open');
        navLinksList.classList.remove('open');
        hamburger.setAttribute('aria-expanded', 'false');
      });
    });
  }

  // --- STICKY NAV SCROLL DETECTION ---
  const header = document.querySelector('header.navbar-container');
  if (header) {
    window.addEventListener('scroll', () => {
      if (window.scrollY > 40) {
        header.classList.add('scrolled');
      } else {
        header.classList.remove('scrolled');
      }
    });
  }

  // --- REVEAL ON SCROLL ---
  const revealElements = document.querySelectorAll('.reveal');
  const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('active');
        observer.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.1,
    rootMargin: '0px 0px -40px 0px'
  });

  revealElements.forEach(element => {
    revealObserver.observe(element);
  });

  // --- CELESTIAL ORBITAL INTERCEPT CANVAS ---
  const canvas = document.getElementById('starfield-canvas');
  if (canvas) {
    const ctx = canvas.getContext('2d');
    let satellites = [];
    let starCount = 35;
    let groundStation = { x: null, y: null };
    let sunPos = { x: null, y: null };

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      
      // Position ground station on the Earth's "crust" (bottom center of viewport)
      groundStation.x = canvas.width * 0.5;
      groundStation.y = canvas.height * 0.95;
      
      // Position virtual Sun (top left)
      sunPos.x = canvas.width * 0.1;
      sunPos.y = canvas.height * 0.15;

      if (canvas.width < 768) {
        starCount = 15;
      } else {
        starCount = 35;
      }
      initSatellites();
    };

    class Satellite {
      constructor() {
        this.x = Math.random() * canvas.width;
        // Orbit altitudes (upper half of screen)
        this.y = Math.random() * (canvas.height * 0.5) + canvas.height * 0.1;
        // Speed of orbit
        this.vx = (Math.random() * 0.25) + 0.15;
        this.size = Math.random() * 3 + 2.5;
        this.id = Math.random().toString(36).substr(2, 4).toUpperCase();
      }

      update() {
        this.x += this.vx;
        // Loop back to left side when leaving screen
        if (this.x > canvas.width + 50) {
          this.x = -50;
          this.y = Math.random() * (canvas.height * 0.5) + canvas.height * 0.1;
        }
      }

      draw() {
        // Draw satellite coordinate marker (+)
        ctx.beginPath();
        ctx.moveTo(this.x, this.y - this.size);
        ctx.lineTo(this.x, this.y + this.size);
        ctx.moveTo(this.x - this.size, this.y);
        ctx.lineTo(this.x + this.size, this.y);
        
        ctx.strokeStyle = 'rgba(190, 235, 255, 0.4)';
        ctx.lineWidth = 0.8;
        ctx.stroke();

        // Draw dynamic target label overlay
        ctx.font = '7px monospace';
        ctx.fillStyle = 'rgba(190, 235, 255, 0.35)';
        ctx.fillText(`SAT-${this.id}`, this.x + 8, this.y - 4);
      }
    }

    const initSatellites = () => {
      satellites = [];
      for (let i = 0; i < starCount; i++) {
        satellites.push(new Satellite());
      }
    };

    const drawInterceptions = () => {
      // Find the satellite closest to the interception window (centered horizontally at orbit heights)
      let targetSatellite = null;
      let minDistance = Infinity;
      const targetWindowX = canvas.width * 0.5;

      satellites.forEach(sat => {
        const distToCenter = Math.abs(sat.x - targetWindowX);
        if (distToCenter < minDistance && sat.x > canvas.width * 0.3 && sat.x < canvas.width * 0.7) {
          minDistance = distToCenter;
          targetSatellite = sat;
        }
      });

      // Render Earth horizon marker at ground level
      ctx.beginPath();
      ctx.arc(groundStation.x, canvas.height * 1.5, canvas.height * 0.56, Math.PI, 2 * Math.PI);
      ctx.strokeStyle = 'rgba(180, 220, 255, 0.08)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Render Ground Station coordinate cross
      ctx.beginPath();
      ctx.moveTo(groundStation.x, groundStation.y - 8);
      ctx.lineTo(groundStation.x, groundStation.y + 8);
      ctx.moveTo(groundStation.x - 8, groundStation.y);
      ctx.lineTo(groundStation.x + 8, groundStation.y);
      ctx.strokeStyle = 'rgba(235, 185, 90, 0.6)';
      ctx.lineWidth = 1.2;
      ctx.stroke();

      ctx.font = '8px monospace';
      ctx.fillStyle = 'rgba(235, 185, 90, 0.6)';
      ctx.fillText('HELIOS-GRID A', groundStation.x - 35, groundStation.y - 12);

      if (targetSatellite) {
        // Heliographic reflection path: 
        // 1. Solar ray from Sun to Earth Station
        ctx.beginPath();
        ctx.moveTo(sunPos.x, sunPos.y);
        ctx.lineTo(groundStation.x, groundStation.y);
        ctx.strokeStyle = 'rgba(235, 185, 90, 0.15)'; // Yellow solar beam
        ctx.lineWidth = 1;
        ctx.stroke();

        // 2. Reflected message beam from Earth Station to Satellite
        ctx.beginPath();
        ctx.moveTo(groundStation.x, groundStation.y);
        ctx.lineTo(targetSatellite.x, targetSatellite.y);
        ctx.strokeStyle = 'rgba(0, 240, 240, 0.35)'; // Cyan signal beam
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Highlight tracking coordinate around target
        ctx.beginPath();
        ctx.arc(targetSatellite.x, targetSatellite.y, 8, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(0, 240, 240, 0.5)';
        ctx.lineWidth = 0.8;
        ctx.stroke();

        // Subtly draw tracking equations text overlay
        ctx.font = '8px monospace';
        ctx.fillStyle = 'rgba(0, 240, 240, 0.5)';
        ctx.fillText(`Target Locked: SAT-${targetSatellite.id}`, targetSatellite.x + 12, targetSatellite.y + 12);
        ctx.fillText(`Az: ${(targetSatellite.x / 10).toFixed(3)}° El: ${(targetSatellite.y / 10).toFixed(3)}°`, targetSatellite.x + 12, targetSatellite.y + 22);
      }
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      satellites.forEach(sat => {
        sat.update();
        sat.draw();
      });
      
      drawInterceptions();
      requestAnimationFrame(animate);
    };

    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();
    animate();
  }
});
