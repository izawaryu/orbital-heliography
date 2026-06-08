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

  // --- GOOGLE SHEETS CONFIGURATION ---
  // Replace with your deployed Google Apps Script Web App URL.
  // Example: 'https://script.google.com/macros/s/AKfycbz.../exec'
  const GOOGLE_SHEETS_API_URL = 'https://script.google.com/macros/s/AKfycbzouUIcbiDGuwZCEw5D1VScn3nZxcdYHjYd78zvpcziCqYfUsxkqsc3YmX-a4ugqkLi1A/exec';

  // --- HELPERS ---
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    if (typeof dateStr === 'string' && !dateStr.includes('-') && !dateStr.includes(':')) {
      return dateStr;
    }
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    
    if (d.getFullYear() === 1899 && d.getMonth() === 11 && d.getDate() === 30) {
      return d.toTimeString().split(' ')[0];
    }
    
    const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  };

  // --- FALLBACK LOGS ---
  const fallbackLogs = [
    {
      date: "2023-11-16 // Sighting",
      title: "Historical Specular Anomaly (Sentinel-2)",
      description: "Specular reflection anomaly detected in Sentinel-2 Level-2A imagery at coordinate (7915, 4384), approximately 158m east-southeast of Wayside Elementary School. Represents a historical observation of ground-to-orbit reflection signature.",
      status: "completed"
    },
    {
      date: "2024-04-10 // Sighting",
      title: "Historical Sighting (Sentinel-2B)",
      description: "Specular reflection anomaly detected in Sentinel-2B Level-2A imagery at coordinate (7915, 4384) near Wayside Elementary School. High-intensity specular flash captured during the orbital transit.",
      status: "completed"
    },
    {
      date: "2024-04-17 // Sighting",
      title: "Historical Sighting (Sentinel-2A)",
      description: "Specular reflection anomaly detected in Sentinel-2A Level-2A imagery at coordinate (7915, 4384) near Wayside Elementary School. High-intensity specular flash captured during the orbital transit.",
      status: "completed"
    },
    {
      date: "2024-05-01 // Sighting",
      title: "Historical Sighting (Sentinel-2B)",
      description: "Specular reflection anomaly detected in Sentinel-2B Level-2A imagery at coordinate (7915, 4384) near Wayside Elementary School. High-intensity specular flash captured during the orbital transit.",
      status: "completed"
    },
    {
      date: "2024-05-31 // Sighting",
      title: "Historical Sighting (Sentinel-2B)",
      description: "Specular reflection anomaly detected in Sentinel-2B Level-2A imagery at coordinate (7915, 4384) near Wayside Elementary School. High-intensity specular flash captured during the orbital transit.",
      status: "completed"
    },
    {
      date: "2024-06-13 // Sighting",
      title: "Historical Sighting (Sentinel-2B)",
      description: "Specular reflection anomaly detected in Sentinel-2B Level-2A imagery at coordinate (7915, 4384) near Wayside Elementary School. High-intensity specular flash captured during the orbital transit.",
      status: "completed"
    },
    {
      date: "2024-06-18 // Sighting",
      title: "Historical Sighting (Sentinel-2A)",
      description: "Specular reflection anomaly detected in Sentinel-2A Level-2A imagery at coordinate (7915, 4384) near Wayside Elementary School. High-intensity specular flash captured during the orbital transit.",
      status: "completed"
    },
    {
      date: "2024-07-03 // Sighting",
      title: "Historical Sighting (Sentinel-2B)",
      description: "Specular reflection anomaly detected in Sentinel-2B Level-2A imagery at coordinate (7915, 4384) near Wayside Elementary School. High-intensity specular flash captured during the orbital transit.",
      status: "completed"
    },
    {
      date: "2024-09-03 // Sighting",
      title: "Historical Sighting (Sentinel-2A)",
      description: "Specular reflection anomaly detected in Sentinel-2A Level-2A imagery at coordinate (7915, 4384) near Wayside Elementary School. High-intensity specular flash captured during the orbital transit.",
      status: "completed"
    },
    {
      date: "2024-09-11 // Sighting",
      title: "Historical Sighting (Sentinel-2B)",
      description: "Specular reflection anomaly detected in Sentinel-2B Level-2A imagery at coordinate (7915, 4384) near Wayside Elementary School. High-intensity specular flash captured during the orbital transit.",
      status: "completed"
    },
    {
      date: "2024-09-28 // Sighting",
      title: "Historical Sighting (Sentinel-2B)",
      description: "Specular reflection anomaly detected in Sentinel-2B Level-2A imagery at coordinate (7915, 4384) near Wayside Elementary School. High-intensity specular flash captured during the orbital transit.",
      status: "completed"
    },
    {
      date: "2024-10-21 // Sighting",
      title: "Historical Sighting (Sentinel-2B)",
      description: "Specular reflection anomaly detected in Sentinel-2B Level-2A imagery at coordinate (7915, 4384) near Wayside Elementary School. High-intensity specular flash captured during the orbital transit.",
      status: "completed"
    },
    {
      date: "2024-10-23 // Sighting",
      title: "Historical Sighting (Sentinel-2A)",
      description: "Specular reflection anomaly detected in Sentinel-2A Level-2A imagery at coordinate (7915, 4384) near Wayside Elementary School. High-intensity specular flash captured during the orbital transit.",
      status: "completed"
    },
    {
      date: "2024-10-26 // Sighting",
      title: "Historical Sighting (Sentinel-2A)",
      description: "Specular reflection anomaly detected in Sentinel-2A Level-2A imagery at coordinate (7915, 4384) near Wayside Elementary School. High-intensity specular flash captured during the orbital transit.",
      status: "completed"
    },
    {
      date: "2024-10-31 // Sighting",
      title: "Historical Sighting (Sentinel-2B)",
      description: "Specular reflection anomaly detected in Sentinel-2B Level-2A imagery at coordinate (7915, 4384) near Wayside Elementary School. High-intensity specular flash captured during the orbital transit.",
      status: "completed"
    },
    {
      date: "2024-12-03 // Sighting",
      title: "Historical Sighting (Sentinel-2A)",
      description: "Specular reflection anomaly detected in Sentinel-2A Level-2A imagery at coordinate (7915, 4384) near Wayside Elementary School. High-intensity specular flash captured during the orbital transit.",
      status: "completed"
    },
    {
      date: "2024-12-07 // Sighting",
      title: "Historical Sighting (Sentinel-2B)",
      description: "Specular reflection anomaly detected in Sentinel-2B Level-2A imagery at coordinate (7915, 4384) near Wayside Elementary School. High-intensity specular flash captured during the orbital transit.",
      status: "completed"
    },
    {
      date: "12 March 2026 // LEO-SYNC-01",
      title: "Helios-Target Alpha",
      description: "Initial targeting window test targeting LEO reflector array. Tracking window: 12 seconds. Result: Target missed due to 0.004s step-motor tracking delay. Coordinate deviations mapped.",
      status: "completed"
    },
    {
      date: "28 April 2026 // LEO-SYNC-02",
      title: "LEO Reflect-Sync",
      description: "Refined step-motor calibration. Tracking window: 18 seconds. Result: Partial reflection feedback confirmed by orbital optical sensor. Calibration delta within 0.0015s.",
      status: "completed"
    },
    {
      date: "2026-05-18 // L2A Sighting",
      title: "LEO Equatorial Sighting (Sentinel-2A)",
      description: "Specular reflection anomaly detected in Sentinel-2A Level-2A imagery at coordinate (7915, 4384) near Wayside Elementary School. Captured during the equatorial meridian tracking test.",
      status: "completed"
    },
    {
      date: "2026-05-31 // L2A Sighting",
      title: "Sighted (Sentinel-2A)",
      description: "Specular reflection anomaly detected in Sentinel-2A Level-2A imagery at coordinate (7915, 4384) near Wayside Elementary School. High-intensity specular flash captured during the orbital transit.",
      status: "completed"
    },
    {
      date: "04 June 2026 // SCHEDULED MISSION",
      title: "Helios-Sync Beta",
      description: "Next scheduled transit sync. Objective: Establish continuous reflection link for 40 seconds to verify high-bandwidth signal modulation. Calibration targets set.",
      status: "scheduled"
    },
    {
      date: "2026-06-05 // L1C Sighting",
      title: "Helios-Sync Beta Sighted (Sentinel-2C)",
      description: "Specular reflection anomaly detected in Sentinel-2C Level-1C raw imagery at coordinate (7915, 4384), approximately 158m east-southeast of Wayside Elementary School. High-intensity specular flash captured during the June 5th orbital transit.",
      status: "completed"
    }
  ];

  // --- RENDER LOGS TO THE TIMELINE ---
  const renderLogs = (logs) => {
    const calendarGrid = document.querySelector('.calendar-grid');
    if (!calendarGrid) return;
    
    calendarGrid.innerHTML = '';
    
    // Deduplicate logs by date key, keeping the last occurrence (most recent update)
    const getDateKey = (dateStr) => {
      if (!dateStr) return '';
      const match = dateStr.match(/(\d{4}-\d{2}-\d{2})/);
      if (match) return match[1];
      const cleanDateStr = dateStr.split(' // ')[0];
      const d = new Date(cleanDateStr);
      if (isNaN(d.getTime())) return dateStr;
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    };

    const uniqueLogsMap = new Map();
    logs.forEach(item => {
      const key = getDateKey(item.date);
      uniqueLogsMap.set(key, item);
    });
    const uniqueLogs = Array.from(uniqueLogsMap.values());
    
    // Sort logs chronologically by parsing the date part
    const sortedLogs = uniqueLogs.sort((a, b) => {
      const parseDate = (dateStr) => {
        if (!dateStr) return 0;
        const match = dateStr.match(/(\d{4}-\d{2}-\d{2})/);
        if (match) {
          return new Date(match[1]).getTime();
        }
        // Fallback for dates like "12 March 2026 // LEO-SYNC-01"
        const cleanDateStr = dateStr.split(' // ')[0];
        const d = new Date(cleanDateStr);
        return isNaN(d.getTime()) ? 0 : d.getTime();
      };
      return parseDate(a.date) - parseDate(b.date);
    });

    sortedLogs.forEach(item => {
      const statusLower = (item.status || '').toLowerCase();
      const isCompleted = statusLower === 'completed' || statusLower === 'recorded' || statusLower === 'completed (recorded)' || statusLower === 'successful';
      const cardClass = isCompleted ? 'calendar-card completed' : 'calendar-card';
      
      const formattedDate = formatDate(item.date);
      const formattedDesc = formatDate(item.description);
      
      let descHTML = '';
      if (formattedDesc) {
        if (formattedDesc.startsWith('http://') || formattedDesc.startsWith('https://')) {
          descHTML = `<a href="${formattedDesc}" target="_blank" class="calendar-link" style="color: var(--accent-cyan); text-decoration: underline; word-break: break-all;">View Copernicus Browser Sighting</a>`;
        } else if (formattedDesc.includes(':') && !formattedDesc.includes('http')) {
          descHTML = `Pass Time: ${formattedDesc}`;
        } else {
          descHTML = formattedDesc;
        }
      }

      let imageHTML = '';
      const dateKey = getDateKey(item.date);
      const dateDigits = dateKey.replace(/-/g, '');
      const availableImageDates = [
        '20231116', '20240409', '20240416', '20240501', '20240531',
        '20240618', '20240703', '20240903', '20240911', '20241021',
        '20241023', '20241026', '20241031', '20241202', '20241207',
        '20260518', '20260605', '20260607'
      ];
      
      if (availableImageDates.includes(dateDigits)) {
        const imgPath = `img/sentinel2_reflection_${dateDigits}.jpg?v=1.0.8`;
        const imgAlt = `Sentinel-2 True Color Crop (${formattedDate})`;
        imageHTML = `
          <div class="calendar-image" style="margin-top: 1.25rem;">
            <a href="${imgPath}" target="_blank" title="Click to view full image">
              <img src="${imgPath}" alt="${imgAlt}" style="width: 100%; border-radius: 4px; border: 1px dashed rgba(255,255,255,0.25); filter: brightness(0.95); transition: all 0.3s;" onmouseover="this.style.filter='brightness(1.1)'; this.style.borderColor='var(--accent-cyan)';" onmouseout="this.style.filter='brightness(0.95)'; this.style.borderColor='rgba(255,255,255,0.25)';">
            </a>
          </div>
        `;
      }

      // Resolve link for the title:
      // 1. If explicit item.link exists, use it.
      // 2. If it contains a date in YYYY-MM-DD format, construct the Copernicus Browser link dynamically.
      let titleHTML = item.title;
      let sightingLink = item.link || '';
      
      if (!sightingLink && item.date) {
        const dateMatch = item.date.match(/(\d{4}-\d{2}-\d{2})/);
        if (dateMatch) {
          const cldDate = dateMatch[1];
          sightingLink = `https://browser.dataspace.copernicus.eu/?zoom=15&lat=40.25141&lng=-74.06918&themeId=DEFAULT-THEME&visualizationUrl=U2FsdGVkX1%2Fh9FzM%2BqVLdNksQrt7sfRfYEvm2gRxtTykRq5iSp4%2Fz%2B8IYbM7nJRriZQWhPQbtiePFta87wcAhA6EUTWucU6uB93Ta6q1bVVCVm%2Br6YHXaWlp0mnEfYis&datasetId=S2_L2A_CDAS&fromTime=${cldDate}T00%3A00%3A00.000Z&toTime=${cldDate}T23%3A59%3A59.999Z&layerId=1_TRUE_COLOR&demSource3D=%22MAPZEN%22&cloudCoverage=30&dateMode=SINGLE`;
        }
      }
      
      if (sightingLink) {
        titleHTML = `<a href="${sightingLink}" target="_blank" class="chalkboard-title-link" style="color: var(--accent-cyan); text-decoration: none; border-bottom: 1px dashed var(--accent-cyan); transition: all 0.3s;" onmouseover="this.style.color='var(--accent-gold)'; this.style.borderColor='var(--accent-gold)';" onmouseout="this.style.color='var(--accent-cyan)'; this.style.borderColor='var(--accent-cyan)';">${item.title}</a>`;
      }
      
      const card = document.createElement('div');
      card.className = cardClass;
      card.innerHTML = `
        <div class="calendar-date">${formattedDate}</div>
        <h3 class="chalk-header">${titleHTML}</h3>
        <p class="calendar-desc">${descHTML}</p>
        ${imageHTML}
      `;
      calendarGrid.appendChild(card);
    });
  };

  // --- LOAD LOG ENTRIES FROM GOOGLE SHEETS ---
  const loadLogs = async () => {
    const calendarGrid = document.querySelector('.calendar-grid');
    if (!calendarGrid) return;

    if (!GOOGLE_SHEETS_API_URL) {
      renderLogs(fallbackLogs);
      return;
    }

    try {
      const response = await fetch(GOOGLE_SHEETS_API_URL);
      if (!response.ok) throw new Error('Network response was not ok');
      const data = await response.json();
      
      if (data && data.length > 0) {
        renderLogs(data);
      } else {
        renderLogs(fallbackLogs);
      }
    } catch (error) {
      console.warn('Failed to load logs from Google Sheets, using static HTML fallback:', error);
      renderLogs(fallbackLogs);
    }
  };

  // --- FORM VISIBILITY TOGGLE ---
  const openFormBtn = document.getElementById('open-log-form-btn');
  const closeFormBtn = document.getElementById('close-log-form-btn');
  const formContainer = document.getElementById('log-form-container');

  if (openFormBtn && formContainer) {
    openFormBtn.addEventListener('click', () => {
      formContainer.style.display = formContainer.style.display === 'none' ? 'block' : 'none';
      if (formContainer.style.display === 'block') {
        formContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    });
  }

  if (closeFormBtn && formContainer) {
    closeFormBtn.addEventListener('click', () => {
      formContainer.style.display = 'none';
    });
  }

  // --- SUBMIT NEW LOG ENTRY TO GOOGLE SHEETS ---
  const logForm = document.getElementById('new-log-form');
  const formFeedback = document.getElementById('form-feedback');

  if (logForm) {
    logForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!GOOGLE_SHEETS_API_URL) {
        if (formFeedback) {
          formFeedback.style.color = 'var(--accent-gold)';
          formFeedback.textContent = 'Sheets API URL not configured in js/main.js';
        }
        return;
      }

      const dateVal = document.getElementById('log-date').value;
      const titleVal = document.getElementById('log-title').value;
      const statusVal = document.getElementById('log-status').value;
      const descVal = document.getElementById('log-desc').value;

      if (formFeedback) {
        formFeedback.style.color = '#fff';
        formFeedback.textContent = 'Transmitting telemetry to Google Sheets...';
      }

      try {
        const payload = {
          date: dateVal,
          title: titleVal,
          description: descVal,
          status: statusVal
        };

        const response = await fetch(GOOGLE_SHEETS_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'text/plain;charset=utf-8' // avoids preflight CORS checks!
          },
          body: JSON.stringify(payload)
        });

        const resData = await response.json();
        
        if (resData.status === 'success') {
          if (formFeedback) {
            formFeedback.style.color = 'var(--accent-cyan)';
            formFeedback.textContent = 'Telemetry recorded successfully!';
          }
          logForm.reset();
          setTimeout(() => {
            loadLogs();
            if (formContainer) formContainer.style.display = 'none';
            if (formFeedback) formFeedback.textContent = '';
          }, 1500);
        } else {
          throw new Error(resData.message || 'Unknown server error');
        }

      } catch (error) {
        console.error('Failed to submit log entry:', error);
        if (formFeedback) {
          formFeedback.style.color = '#ff6b6b';
          formFeedback.textContent = `Transmission failed: ${error.message}`;
        }
      }
    });
  }

  // Run initialization load
  loadLogs();
});
