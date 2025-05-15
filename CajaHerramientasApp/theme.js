// theme.js
(function() {
  const themes = {
    noche:      { bgGradient: 'linear-gradient(to bottom, #333, #000)',     color: '#e0e0e0', accent: '#4fc3f7' },
    selva:      { bgGradient: 'linear-gradient(to bottom, #2e4628, #1b2f1a)', color: '#e1ffe1', accent: '#8bc34a' },
    lluvia:     { bgGradient: 'linear-gradient(to bottom, #263238, #1b2a32)', color: '#cfd8dc', accent: '#4dd0e1' },
    pinki:      { bgGradient: 'linear-gradient(to bottom, #fce4ec, #f8bbd0)', color: '#880e4f', accent: '#f06292' },
    tecnologico:{ bgGradient: 'linear-gradient(to bottom, #0d1b2a, #07101a)', color: '#e0e1dd', accent: '#00bcd4' },
    cristal:    { bgGradient: 'linear-gradient(to bottom, #ffffffcc, #e0f7facc)', color: '#000',    accent: '#81d4fa' },
    desierto:   { bgGradient: 'linear-gradient(to bottom, #f4e2d8, #dcc3b2)', color: '#4e342e', accent: '#ff9800' },
    neon:       { bgGradient: 'linear-gradient(to bottom, #1a1a2e, #0f0f1a)', color: '#fff',    accent: '#e91e63' },
    espacio:    { bgGradient: 'linear-gradient(to bottom, #000000, #0a0a0a)', color: '#cfcfcf', accent: '#7e57c2' },
    aqua:       { bgGradient: 'linear-gradient(to bottom, #01579b, #013f6e)', color: '#e0f7fa', accent: '#4dd0e1' }
  };

  function applyTheme(name) {
    const t = themes[name] || themes.noche;
    // fondo
    document.body.style.background = t.bgGradient;
    // paleta
    document.documentElement.style.setProperty('--text-color', t.color);
    document.documentElement.style.setProperty('--accent-color', t.accent);
    // si tienes la capa de edificios:
    const city = document.getElementById('ciudadEdificios');
    if (city) city.style.display = name==='noche' ? 'flex' : 'none';
    // bordes y textos de botones/selectores
    document.querySelectorAll('.tool-button, select').forEach(el => {
      el.style.borderColor = t.accent;
      el.style.color = t.color;
      // si quieres, ajusta background de botones aquí también
    });
  }

  // Al cargar la página, leo el tema y lo aplico
  window.addEventListener('DOMContentLoaded', () => {
    const theme = localStorage.getItem('vieroTheme') || 'noche';
    applyTheme(theme);
  });

  // Exporto global para poder reutilizarlo si cambias tema en la misma página
  window.applyTheme = applyTheme;
})();
