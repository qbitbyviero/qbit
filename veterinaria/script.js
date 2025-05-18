// script.js

// URL de tu WebApp en Apps Script
const WEBAPP_URL = 'https://script.google.com/macros/s/AKfycbwI_7h0CUukKfjcGwp-KUwFSsrQcOBYp5Q27YK0bTMfv2jpubgPYIk27xjDr4d_o4lX/exec';

let calendar;
let fechaSeleccionada = null;

// Map de razas
const razasPorEspecie = {
  '🐶 Perro': ['Labrador 🐶', 'Pug 😛', 'Chihuahua 💅', 'Pitbull 💪'],
  '🐱 Gato': ['Persa 😽', 'Siames 😸', 'Sphynx 🐱', 'Maine Coon 🧶'],
  '🐰 Conejo': ['Cabeza de león 🦁', 'Mini Lop 🐰', 'Angora ✨'],
  '🦜 Ave': ['Periquito 🐦', 'Cacatúa 🎵', 'Loro 💚'],
  '🐹 Hámster': ['Sirio 🧡', 'Enano ruso ❄️', 'Roborovski ⚡'],
  '🐢 Tortuga': ['Orejas rojas 🐢', 'Tortuga rusa 🌿'],
  '🦎 Reptil': ['Iguana 🦎', 'Gecko 🐊', 'Camaleón 🌈']
};

// Espera a que el DOM esté listo
window.addEventListener('DOMContentLoaded', () => {
  initApp();
  initBlobMenu();
  // Cierre de modales al clicar fondo
  window.addEventListener('click', e => {
    if (e.target.classList.contains('modal')) {
      cerrarModal(e.target.id);
    }
  });
});

// ================== INICIALIZACIÓN ==================

function initApp() {
  // Mostramos splash 3s
  setTimeout(() => {
    document.getElementById('splash').style.display = 'none';
    document.getElementById('daily-appointments').style.display = 'block';
    setupAppointmentButtons();
    cargarCitasDelDia();
  }, 3000);
}

function setupAppointmentButtons() {
  document.getElementById('print-btn').onclick = () => window.print();
  document.getElementById('show-btn').onclick = mostrarCitasBonitas;
  document.getElementById('start-btn').onclick = () => {
    document.getElementById('daily-appointments').style.display = 'none';
    document.getElementById('calendar-container').style.display = 'block';
    if (!calendar) initCalendar();
  };
}

// ================== CITAS DEL DÍA ==================

async function cargarCitasDelDia() {
  try {
    const hoy = new Date().toISOString().split('T')[0];
    google.script.run.withSuccessHandler(citas => {
      const lista = document.getElementById('appointments-list');
      // Fecha en español
      const opcionesFecha = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
      document.getElementById('current-date').textContent =
        '📅 ' + new Date(hoy).toLocaleDateString('es-MX', opcionesFecha);
      lista.innerHTML = citas.length
        ? citas.map(c => `<li>🐶 <strong>${c.Paciente}</strong> (Dueño: ${c.Cliente})<br>⏰ ${formatHora(c.Hora)}<br>📝 ${c.Motivo}</li>`).join('')
        : '<li>No hay citas programadas para hoy.</li>';
    }).getCitas(hoy);
  } catch (e) {
    console.error(e);
  }
}

function formatHora(horaRaw) {
  if (!horaRaw) return '---';
  if (!isNaN(horaRaw)) {
    const totalMin = Math.round(parseFloat(horaRaw) * 24 * 60);
    const h = Math.floor(totalMin / 60), m = totalMin % 60;
    return `${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}`;
  }
  const m = horaRaw.match(/\d{1,2}:\d{2}/);
  return m ? m[0] : horaRaw;
}

// ================== CALENDARIO ==================

function initCalendar() {
  const el = document.getElementById('calendar');
  calendar = new FullCalendar.Calendar(el, {
    initialView: 'dayGridMonth',
    locale: 'es',
    headerToolbar: { left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek,timeGridDay' },
    selectable: true,
    dateClick: info => abrirModal('modalNuevaCita', info.dateStr),
    events: (fetchInfo, success) => {
      google.script.run.withSuccessHandler(citas => {
        success(citas.map(c => ({
          title: `${c.Paciente} - ${c.Motivo}`,
          start: c.Fecha,
          color: getColorForAppointmentType(c.Motivo)
        })));
      }).getCitas();
    }
  });
  calendar.render();
}

function getColorForAppointmentType(motivo) {
  const map = {
    'Control de peso':'#4CAF50','Consulta general':'#2196F3','Revisión':'#FFC107',
    'Vacunación':'#9C27B0','Desparasitación':'#795548','Estética':'#FF9800',
    'Cita':'#607D8B'
  };
  return map[motivo]||'#607D8B';
}

// ================== MODALES GENERALES ==================

function abrirModal(id, fecha=null) {
  const m = document.getElementById(id);
  if (!m) return;
  m.style.display = 'flex';
  document.body.style.overflow = 'hidden';
  if (id==='modalNuevaCita') fechaSeleccionada = fecha;
  if (id==='modalVacunas') prepararVacunas();
}

function cerrarModal(id) {
  const m = document.getElementById(id);
  if (!m) return;
  m.style.display = 'none';
  document.body.style.overflow = 'auto';
}

// ================== NUEVA CITA ==================

function guardarNuevaCita() {
  const datos = {
    action: 'guardarCitaAvanzada',
    fecha: fechaSeleccionada,
    hora: document.getElementById('horaInput').value,
    paciente: document.getElementById('mascotaInput').value.trim(),
    cliente: document.getElementById('duenoInput').value.trim(),
    motivo: document.getElementById('motivoInput').value.trim(),
    estatus: document.getElementById('estatusInput').value,
    notas: document.getElementById('notasInput').value.trim(),
    costo: document.getElementById('costoInput').value.trim()
  };
  google.script.run.withSuccessHandler(res => {
    if (res.status==='success') {
      cerrarModal('modalNuevaCita');
      calendar.refetchEvents();
      mostrarAlerta('📌 Cita guardada', 'success');
      // Abrir ticket
      const url = `${WEBAPP_URL}?action=verTicket&paciente=${encodeURIComponent(datos.paciente)}&cliente=${encodeURIComponent(datos.cliente)}&motivo=${encodeURIComponent(datos.motivo)}&costo=${encodeURIComponent(datos.costo)}`;
      window.open(url,'_blank','width=400,height=600');
    }
  }).guardarCitaAvanzada(datos);
}

// ================== VACUNAS ==================

function prepararVacunas() {
  const sel = document.getElementById('nombreVacuna');
  sel.innerHTML = '<option>Cargando...</option>';
  google.script.run.withSuccessHandler(vacs => {
    sel.innerHTML = '<option value=\"\">Seleccione vacuna</option>';
    vacs.forEach(v => sel.add(new Option(v.nombre, v.nombre)));
  }).getVacunas();
}

function guardarVacuna() {
  const datos = {
    action: 'guardarVacuna',
    idCliente: document.getElementById('idCliente').value||'',
    idMascota: document.getElementById('idMascota').value||'',
    nombreMascota: document.getElementById('nombreMascota').value.trim(),
    nombreDueno: document.getElementById('nombreDueno').value.trim(),
    especie: document.getElementById('especieSelect').value,
    raza: document.getElementById('raza').value,
    edad: document.getElementById('edad').value,
    sexo: document.getElementById('sexo').value,
    peso: document.getElementById('peso').value,
    vacuna: document.getElementById('nombreVacuna').value,
    fechaAplicacion: document.getElementById('fechaAplicacion').value,
    fechaRefuerzo: document.getElementById('fechaRefuerzo').value,
    veterinario: document.getElementById('veterinario').value.trim(),
    observaciones: document.getElementById('observaciones').value.trim()
  };
  google.script.run.withSuccessHandler(res => {
    if (res.status==='success') {
      mostrarAlerta('✅ Vacuna registrada','success');
      cerrarModal('modalVacunas');
    }
  }).guardarVacuna(datos);
}

// ================== BLOB MENU (goo) ==================

function initBlobMenu() {
  // Asegúrate de cargar GSAP y DrawSVGPlugin en tu HTML
  document.querySelectorAll('.blob-button').forEach(btn => {
    const lines = btn.querySelectorAll('.blob-line');
    btn.addEventListener('mouseenter', () => {
      const i = Math.floor(Math.random()*lines.length);
      const l = lines[i];
      gsap.set(l, {autoAlpha:1, drawSVG:'40% 40%'} );
      gsap.to(l, {duration:0.8, drawSVG:'40% 70%'});
      gsap.to(l, {duration:0.8, delay:0.8, drawSVG:'100% 100%', ease:'power2.out', onComplete: ()=>gsap.set(l,{autoAlpha:0})});
    });
  });
}

// ================== UTILITARIOS ==================

function mostrarAlerta(msg,type='info') {
  const colors = { success:'#4CAF50', error:'#F44336', info:'#2196F3' };
  Toastify({ text: msg, duration:3000, close:true, gravity:'top', position:'right', backgroundColor:colors[type] }).showToast();
}

function mostrarCitasBonitas() {
  const contenido = document.getElementById('daily-appointments').outerHTML;
  const w = window.open('','_blank');
  w.document.write(`<html><head><title>Citas</title></head><body>${contenido}</body></html>`);
  w.document.close();
}
