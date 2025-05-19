const WEBAPP_URL = 'https://script.google.com/macros/s/AKfycbygeTmeEpPvYaOh3e2loYib8NGrFr9jMIqPPvCEuT3jjh2O62rXRnqfokf8Svso7mgR/exec';
let calendar;
let citasPendientes = [];

// Mapeo de razas por especie
const razasPorEspecie = {
  '🐶 Perro': ['Labrador 🐶', 'Pug 😛', 'Chihuahua 💅', 'Pitbull 💪'],
  '🐱 Gato': ['Persa 😽', 'Siames 😸', 'Sphynx 🐱', 'Maine Coon 🧶'],
  '🐰 Conejo': ['Cabeza de león 🦁', 'Mini Lop 🐰', 'Angora ✨'],
  '🦜 Ave': ['Periquito 🐦', 'Cacatúa 🎵', 'Loro 💚'],
  '🐹 Hámster': ['Sirio 🧡', 'Enano ruso ❄️', 'Roborovski ⚡'],
  '🐢 Tortuga': ['Tortuga de orejas rojas 🐢', 'Tortuga rusa 🌿'],
  '🦎 Reptil': ['Iguana 🦎', 'Gecko 🐊', 'Camaleón 🌈']
};

// ========== FUNCIONES PRINCIPALES ==========

function cargarModal(nombreArchivo) {
  fetch(nombreArchivo)
    .then(response => response.text())
    .then(html => {
      document.getElementById("modales-container").innerHTML = html;
    })
    .catch(err => console.error("Error al cargar el modal:", err));
}

async function initApp() {
  setTimeout(async () => {
    document.getElementById('splash').style.display = 'none';
    document.getElementById('daily-appointments').style.display = 'block';
    configurarSelectores();
    await cargarCitasDelDia();
    setupMenuNavigation();
    actualizarRazas();
  }, 3000);
}

async function cargarCitasDelDia() {
  try {
    const hoy = new Date().toISOString().split('T')[0];
    const response = await fetch(`${WEBAPP_URL}?action=getCitas&fecha=${hoy}`);
    const citas = await response.json();
    const lista = document.getElementById('appointments-list');

    const opcionesFecha = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    document.getElementById('current-date').textContent =
      "📅 " + new Date().toLocaleDateString('es-MX', opcionesFecha);

    lista.innerHTML = citas.length ? '' : '<li>No hay citas programadas para hoy.</li>';

    citas.forEach(cita => {
      const mascota = cita['Paciente'] || '---';
      const dueno = cita['Cliente'] || '---';

      let hora = '---';
      if (cita['Hora']) {
        const valor = cita['Hora'];
        if (!isNaN(valor)) {
          const minutosTotales = Math.round(parseFloat(valor) * 24 * 60);
          const horas = Math.floor(minutosTotales / 60);
          const minutos = minutosTotales % 60;
          hora = `${horas.toString().padStart(2, '0')}:${minutos.toString().padStart(2, '0')}`;
        } else if (typeof valor === 'string') {
          const match = valor.match(/\d{1,2}:\d{2}/);
          hora = match ? match[0] : valor;
        }
      }

      const motivo = cita['Motivo'] || 'Sin motivo';

      const li = document.createElement('li');
      li.innerHTML = `
        🐶 <strong>${mascota}</strong> (Dueño: ${dueno})<br>
        ⏰ ${hora}<br>
        📝 ${motivo}
      `;
      lista.appendChild(li);
    });

    configurarBotones();
  } catch (error) {
    console.error('Error:', error);
    document.getElementById('appointments-list').innerHTML = `
      <li style="color: red;">Error al cargar citas. Recarga la página.</li>
    `;
  }
}

function configurarBotones() {
  document.getElementById('print-btn').addEventListener('click', () => window.print());
  document.getElementById('show-btn').addEventListener('click', () => {
    const contenido = document.getElementById('daily-appointments').outerHTML;
    const ventana = window.open('', '_blank');
    ventana.document.write(`
      <html>
        <head>
          <title>Citas del Día - Posh Posh</title>
          <style>${document.querySelector('style').innerHTML}</style>
        </head>
        <body>${contenido}</body>
      </html>
    `);
  });
  document.getElementById('start-btn').addEventListener('click', () => {
    document.getElementById('daily-appointments').style.display = 'none';
    document.getElementById('calendar-container').style.display = 'block';
    initCalendar();
  });
}

async function initCalendar() {
  const calendarEl = document.getElementById('calendar');
  document.getElementById('calendar-container').style.display = 'block';

  calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: 'dayGridMonth',
    locale: 'es',
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: 'dayGridMonth,timeGridWeek,timeGridDay'
    },
    height: 'auto',
    selectable: true,

    dateClick: (info) => {
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);
      const seleccionada = new Date(info.dateStr);

      if (seleccionada < hoy) {
        mostrarAlerta('No puedes agendar una cita en una fecha pasada.', 'error');
        return;
      }

      fechaSeleccionada = info.dateStr;
      abrirModal('modalNuevaCita');
    },

    events: async (fetchInfo, successCallback) => {
      try {
        const response = await fetch(`${WEBAPP_URL}?action=getCitas`);
        const citas = await response.json();

        const eventos = citas.map(cita => {
          const paciente = cita.Paciente || 'Mascota';
          const motivo = cita.Motivo || 'Sin motivo';
          const fecha = cita.Fecha || cita.fecha || '';

          return {
            title: `${paciente} - ${motivo}`,
            start: fecha,
            allDay: true,
            extendedProps: cita,
            color: getColorForAppointmentType(motivo)
          };
        });

        successCallback(eventos);
      } catch (error) {
        console.error('Error al cargar eventos del calendario:', error);
        mostrarAlerta('❌ Error al cargar citas en el calendario', 'error');
      }
    }
  });

  calendar.render();
}

function getColorForAppointmentType(motivo) {
  const colors = {
    'Control de peso': '#4CAF50',
    'Consulta general': '#2196F3',
    'Revisión': '#FFC107',
    'Vacunación': '#9C27B0',
    'Desparasitación': '#795548',
    'Estética': '#FF9800',
    'Vacunas': '#4CAF50',
    'Consulta': '#2196F3',
    'Eutanasia': '#9C27B0',
    'Cirugía': '#F44336'
  };
  return colors[motivo] || '#607D8B';
}

// ========== FUNCIONES DE CLIENTES ==========

async function guardarCliente(event) {
  event.preventDefault();
  if (!validarFormulario()) return false;

  const formData = {
    nombreDueno: document.getElementById('nombreDueno').value.trim(),
    direccion: document.getElementById('direccion').value.trim(),
    telefono: document.getElementById('telefono').value.trim(),
    correo: document.getElementById('correo').value.trim(),
    nombreMascota: document.getElementById('nombreMascota').value.trim(),
    edad: document.getElementById('edad').value,
    peso: document.getElementById('peso').value,
    sexo: document.getElementById('sexo').value,
    especie: document.getElementById('especieSelect').value,
    raza: document.getElementById('raza').value
  };

  try {
    const existe = await verificarClienteExistente(formData.nombreDueno, formData.nombreMascota);
    if (existe.duenoYmascota) {
      mostrarAlerta('¡Este cliente y mascota ya están registrados!', 'error');
      return;
    }

    const response = await fetch(WEBAPP_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'guardarCliente', ...formData })
    });

    const result = await response.json();
    if (result.status === 'success') {
      mostrarAlerta('✅ Registro exitoso!', 'success');
      cerrarModal('modalNuevoCliente');
      document.getElementById('formNuevoCliente').reset();
    } else {
      throw new Error(result.message || 'Fallo en el servidor');
    }
  } catch (error) {
    console.error('Error:', error);
    mostrarAlerta('❌ Error al guardar: ' + error.message, 'error');
  }
}

// ========== FUNCIONES DE VACUNAS ==========

function abrirModalVacunas() {
  document.getElementById('modalVacunas').style.display = 'flex';
  document.body.style.overflow = 'hidden';
  cargarVacunasModal();
}

async function cargarVacunasModal() {
  const sel = document.getElementById('nombreVacuna');
  sel.innerHTML = '<option>Cargando...</option>';
  try {
    const res = await fetch(`${WEBAPP_URL}?action=getVacunas`);
    const js = await res.json();
    sel.innerHTML = '<option value="">Seleccione vacuna</option>';
    js.vacunas.forEach(v => {
      const o = document.createElement('option');
      o.value = v.nombre; o.textContent = v.nombre;
      sel.appendChild(o);
    });
  } catch {
    sel.innerHTML = '<option>Error al cargar</option>';
  }
}

async function guardarVacuna() {
  const form = document.getElementById('formVacuna');
  const data = Object.fromEntries(new FormData(form).entries());
  data.action = 'guardarVacuna';

  // Formatea edad/peso para decimal
  const [años, meses] = data.edad.match(/(\d+)/g).map(Number);
  data.edad = parseFloat(`${años}.${meses}`);
  const [kg, gr] = data.peso.match(/(\d+)/g).map(Number);
  data.peso = parseFloat(`${kg}.${gr}`);

  try {
    const res = await fetch(WEBAPP_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const json = await res.json();
    if (json.status === 'success') {
      Toastify({ text: '✅ Vacuna registrada', gravity: 'top', backgroundColor: '#4CAF50' }).showToast();
      cerrarModal('modalVacunas');
      form.reset();
    } else throw new Error(json.message);
  } catch (e) {
    Toastify({ text: `❌ ${e.message}`, gravity: 'top', backgroundColor: '#F44336' }).showToast();
  }
}

// ========== FUNCIONES AUXILIARES ==========

function setupMenuNavigation() {
  document.querySelectorAll('nav a').forEach(link => {
    if (link.getAttribute('href').startsWith('#')) {
      link.addEventListener('click', e => {
        e.preventDefault();
        const targetId = link.getAttribute('href').substring(1);
        document.querySelectorAll('[id$="-section"]').forEach(section => {
          section.style.display = section.id === `${targetId}-section` ? 'block' : 'none';
        });
      });
    }
  });
}

function abrirModal(id) {
  const m = document.getElementById(id);
  if (m) { m.style.display = 'block'; document.body.style.overflow = 'hidden'; }
}

function cerrarModal(id) {
  const m = document.getElementById(id);
  if (m) { m.style.display = 'none'; document.body.style.overflow = 'auto'; }
}

function actualizarRazas() {
  const esp = document.getElementById("especieSelect"), raz = document.getElementById("raza");
  if (!raz) return;
  raz.innerHTML = "<option value=''>Seleccione especie primero</option>";
  if (!esp.value) return;
  (razasPorEspecie[esp.value]||[]).forEach(r => {
    const o = document.createElement("option");
    o.value = r.split(' ')[0]; o.textContent = r; raz.appendChild(o);
  });
}

function configurarSelectores() {
  document.addEventListener('change', e => {
    if (e.target.id === 'especieSelect') actualizarRazas();
  });
}

function validarFormulario() {
  const campos = ['nombreDueno','direccion','telefono','correo','nombreMascota','edad','peso'];
  for (let c of campos) {
    if (!document.getElementById(c).value.trim()) {
      mostrarAlerta(`Complete el campo ${c}`, 'error');
      return false;
    }
  }
  const em = document.getElementById('correo').value;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) {
    mostrarAlerta('Ingrese un correo válido', 'error');
    return false;
  }
  return true;
}

function mostrarAlerta(msg, tipo = 'info') {
  const colores = { success: '#4CAF50', error: '#F44336', info: '#2196F3' };
  Toastify({ text: msg, duration: 3000, backgroundColor: colores[tipo], close: true, gravity: "top", position: "right" }).showToast();
}

// ========== OTRAS FUNCIONES ==========

function mostrarCitasBonitas() {
  const lista = document.getElementById('appointments-list');
  const w = window.open('', '_blank');
  w.document.write(`
    <html><head><title>Citas del día</title>
    <style>body{font-family:Arial;padding:20px}h2{color:#444}li{margin-bottom:15px;border-bottom:1px solid #ccc;padding-bottom:10px}</style>
    </head><body><h2>Citas programadas para hoy</h2><ul>${lista.innerHTML}</ul></body></html>`);
  w.document.close();
}

let calendarioInicializado = false;
let fechaSeleccionada = null;

function comenzar() {
  document.getElementById('daily-appointments').style.display = 'none';
  document.getElementById('calendar-container').style.display = 'block';
  if (!calendarioInicializado) { initCalendar(); calendarioInicializado = true; }
}

function abrirModalNuevaCita(fecha) {
  fechaSeleccionada = fecha;
  abrirModal('modalNuevaCita');
}

// Al cerrar haciendo clic fuera
document.addEventListener('DOMContentLoaded', initApp);
window.addEventListener('click', event => {
  if (event.target.classList.contains('modal')) {
    event.target.style.display = 'none';
    document.body.style.overflow = 'auto';
  }
});
