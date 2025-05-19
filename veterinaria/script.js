/* script.js - Veterinaria Posh Posh
   Versión corregida y unificada de funciones principales, calendario, modales y vacunación
   Mantén comentadas las funciones que podrían usarse luego. */

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

// ========== CARGA DE MODALES ==========

/**
 * Carga un modal externo y lo muestra.
 * @param {string} archivo - URL/local HTML del modal
 * @param {string} idModal - ID del contenedor modal dentro del HTML
 */
function cargarYMostrarModal(archivo, idModal) {
  fetch(archivo)
    .then(res => res.text())
    .then(html => {
      const cont = document.getElementById('modales-container');
      cont.innerHTML = html;
      const modal = document.getElementById(idModal);
      if (modal) {
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        // inicializar lógica específica de modales:
        if (idModal === 'modalVacunas') {
          cargarVacunasModal();
          initVacunasModal();
        }
      }
    })
    .catch(err => console.error('Error al cargar el modal:', err));
}

// antigua función cargarModal (deprecada)
// function cargarModal(nombreArchivo) { /*...*/ }

// ========== INICIALIZACIÓN PRINCIPAL ==========

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

document.addEventListener('DOMContentLoaded', initApp);
// cerrar modales al hacer click fuera
window.addEventListener('click', event => {
  if (event.target.classList.contains('modal')) {
    event.target.style.display = 'none';
    document.body.style.overflow = 'auto';
  }
});

// ========== CITAS DEL DÍA ==========

async function cargarCitasDelDia() {
  try {
    const hoy = new Date().toISOString().split('T')[0];
    const resp = await fetch(`${WEBAPP_URL}?action=getCitas&fecha=${hoy}`);
    const citas = await resp.json();
    const lista = document.getElementById('appointments-list');
    const opts = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    document.getElementById('current-date').textContent = '📅 ' +
      new Date().toLocaleDateString('es-MX', opts);
    lista.innerHTML = citas.length ? '' : '<li>No hay citas programadas para hoy.</li>';
    citas.forEach(c => {
      let hora = '---';
      if (c.Hora) {
        const val = c.Hora;
        if (!isNaN(val)) {
          const mins = Math.round(parseFloat(val) * 24 * 60);
          const h = Math.floor(mins / 60), m = mins % 60;
          hora = `${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}`;
        } else {
          const m = val.match(/\d{1,2}:\d{2}/);
          hora = m ? m[0] : val;
        }
      }
      const li = document.createElement('li');
      li.innerHTML = `🐶 <strong>${c.Paciente||'---'}</strong> (Dueño: ${c.Cliente||'---'})<br>` +
        `⏰ ${hora}<br>📝 ${c.Motivo||'Sin motivo'}`;
      lista.appendChild(li);
    });
    configurarBotones();
  } catch (e) {
    console.error(e);
    document.getElementById('appointments-list').innerHTML =
      '<li style="color:red;">Error al cargar citas. Recarga la página.</li>';
  }
}

function configurarBotones() {
  document.getElementById('print-btn').onclick = () => window.print();
  document.getElementById('show-btn').onclick = () => {
    const html = document.getElementById('daily-appointments').outerHTML;
    const w = window.open('', '_blank');
    w.document.write(`<html><head><title>Citas</title><style>` +
      document.querySelector('style').innerHTML +
      `</style></head><body>${html}</body></html>`);
  };
  document.getElementById('start-btn').onclick = () => {
    document.getElementById('daily-appointments').style.display = 'none';
    document.getElementById('calendar-container').style.display   = 'block';
    initCalendar();
  };
}

// ========== CALENDARIO ==========

async function initCalendar() {
  const el = document.getElementById('calendar');
  document.getElementById('calendar-container').style.display = 'block';
  calendar = new FullCalendar.Calendar(el, {
    initialView: 'dayGridMonth', locale:'es', height:'auto', selectable:true,
    headerToolbar: { left:'prev,next today', center:'title', right:'dayGridMonth,timeGridWeek,timeGridDay' },
    dateClick: info => {
      const hoy = new Date(); hoy.setHours(0,0,0,0);
      const sel = new Date(info.dateStr);
      if (sel < hoy) return mostrarAlerta('No puedes agendar en fecha pasada','error');
      fechaSeleccionada = info.dateStr;
      abrirModal('modalNuevaCita');
    },
    events: async (_, cb) => {
      try {
        const res = await fetch(`${WEBAPP_URL}?action=getCitas`);
        const c   = await res.json();
        cb(c.map(o=>({
          title:`${o.Paciente||'Mascota'} - ${o.Motivo||'Sin motivo'}`,
          start:o.Fecha||'', allDay:true, extendedProps:o,
          color:getColorForAppointmentType(o.Motivo)
        })));
      } catch {
        mostrarAlerta('❌ Error cargando calendario','error');
      }
    }
  });
  calendar.render();
}

function getColorForAppointmentType(m) {
  const col = {
    'Control de peso':'#4CAF50','Consulta general':'#2196F3','Revisión':'#FFC107',
    'Vacunación':'#9C27B0','Desparasitación':'#795548','Estética':'#FF9800',
    'Vacunas':'#4CAF50','Consulta':'#2196F3','Eutanasia':'#9C27B0','Cirugía':'#F44336'
  };
  return col[m]||'#607D8B';
}

// ========== GESTIÓN DE CITAS NUEVAS ==========

let fechaSeleccionada = null;

async function guardarNuevaCita() {
  const cita = {
    fecha: fechaSeleccionada,
    hora: document.getElementById('horaInput').value,
    paciente: document.getElementById('mascotaInput').value,
    cliente:  document.getElementById('duenoInput').value,
    motivo:   document.getElementById('motivoInput').value,
    estatus:  document.getElementById('estatusInput').value,
    notas:    document.getElementById('notasInput').value,
    costo:    document.getElementById('costoInput').value
  };
  try {
    const res = await fetch(WEBAPP_URL, { method:'POST', body:JSON.stringify({ action:'guardarCitaAvanzada', ...cita }) });
    const j   = await res.json();
    if (j.status==='success') {
      cerrarModal('modalNuevaCita');
      mostrarAlerta('📌 Cita guardada','success');
      calendar.refetchEvents();
      const url = `${WEBAPP_URL}?action=verTicket&paciente=${encodeURIComponent(cita.paciente)}` +
                  `&cliente=${encodeURIComponent(cita.cliente)}&motivo=${encodeURIComponent(cita.motivo)}` +
                  `&costo=${encodeURIComponent(cita.costo)}`;
      window.open(url,'_blank','width=400,height=600');
    } else throw new Error(j.message);
  } catch (e) {
    console.error(e);
    mostrarAlerta('❌ Error guardando cita','error');
  }
}

// ========== CLIENTES ==========

async function guardarCliente(event) {
  event.preventDefault();
  if (!validarFormulario()) return;
  const fd = ['nombreDueno','direccion','telefono','correo','nombreMascota','edad','peso','sexo','especieSelect','raza']
    .reduce((o,id)=>{ o[id]=document.getElementById(id).value; return o; },{});
  try {
    const existe = await verificarClienteExistente(fd.nombreDueno, fd.nombreMascota);
    if (existe.duenoYmascota) return mostrarAlerta('¡Cliente y mascota ya registrados!','error');
    const res = await fetch(WEBAPP_URL, { method:'POST', headers:{'Content-Type':'application/json'},
      body:JSON.stringify({ action:'guardarCliente', ...fd }) });
    const j   = await res.json();
    if (j.status==='success') {
      mostrarAlerta('✅ Registro exitoso','success');
      cerrarModal('modalNuevoCliente');
      document.getElementById('formNuevoCliente').reset();
    } else throw new Error(j.message);
  } catch(e) {
    console.error(e);
    mostrarAlerta('❌ Error guardando cliente','error');
  }
}

// Verifica cliente-mascota existente en Sheets
async function verificarClienteExistente(nombreDueno, nombreMascota) {
  const r = await fetch(`${WEBAPP_URL}?action=verificarCliente&nombreDueno=${
    encodeURIComponent(nombreDueno)}&nombreMascota=${
    encodeURIComponent(nombreMascota)}`);
  return await r.json();
}

// ========== VACUNAS ==========

function abrirModalVacunas() {
  cargarYMostrarModal('Vacunas.html','modalVacunas');
}

async function cargarVacunasModal() {
  const sel = document.getElementById('nombreVacuna');
  sel.innerHTML = '<option>Cargando...</option>';
  try {
    const res = await fetch(`${WEBAPP_URL}?action=getVacunas`);
    const js  = await res.json();
    sel.innerHTML = '<option value=\"\">Seleccione vacuna</option>';
    js.vacunas.forEach(v=>{
      const o = document.createElement('option'); o.value=v.nombre; o.textContent=v.nombre;
      sel.appendChild(o);
    });
  } catch {
    sel.innerHTML = '<option>Error al cargar</option>';
  }
}

function initVacunasModal() {
  document.getElementById('btnExistente').onclick = e => {
    e.preventDefault();
    document.getElementById('seccionExistente').style.display = 'block';
    document.getElementById('seccionNuevo').style.display      = 'none';
    document.getElementById('datosMascota').style.display      = 'none';
    cargarListaMascotas();
  };
  document.getElementById('btnNuevo').onclick = e => {
    e.preventDefault();
    document.getElementById('seccionNuevo').style.display      = 'block';
    document.getElementById('seccionExistente').style.display  = 'none';
    document.getElementById('datosMascota').style.display      = 'block';
  };
  document.getElementById('cargarDatosClienteBtn').onclick = async () => {
    const nombre = document.getElementById('selectMascota').value;
    if (!nombre) return alert('Seleccione mascota');
    const resp = await fetch(`${WEBAPP_URL}?action=getDatosCliente&nombreMascota=${encodeURIComponent(nombre)}`);
    const info = await resp.json();
    document.getElementById('datosMascota').style.display = 'block';
    document.getElementById('idCliente').value     = info.idCliente;
    document.getElementById('idMascota').value     = info.idMascota;
    document.getElementById('nombreMascota').value = info.nombreMascota;
    document.getElementById('especie').value       = info.especie;
    document.getElementById('raza').value          = info.raza;
    const [a,m] = info.edad.toString().split('.').map(n=>parseInt(n));
    document.getElementById('edad').value          = `${a} años, ${m} meses`;
    const [kg,gr] = info.peso.toString().split('.').map(n=>parseInt(n));
    document.getElementById('peso').value          = `${kg} kg, ${gr} g`;
    document.getElementById('sexo').value          = info.sexo;
  };
}

// Lista de mascotas para clientes existentes
async function cargarListaMascotas() {
  const resp = await fetch(`${WEBAPP_URL}?action=getClientesMascotas`);
  const data = await resp.json();
  const sel  = document.getElementById('selectMascota');
  sel.innerHTML = '<option value=\"\">Seleccione mascota</option>';
  data.mascotas.forEach(m => sel.add(new Option(m, m)));
}

// Guardar vacuna
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
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify(data)
    });
    const json = await res.json();
    if (json.status === 'success') {
      Toastify({ text:'✅ Vacuna registrada', gravity:'top', backgroundColor:'#4CAF50' }).showToast();
      cerrarModal('modalVacunas');
      form.reset();
    } else throw new Error(json.message);
  } catch (e) {
    Toastify({ text:`❌ ${e.message}`, gravity:'top', backgroundColor:'#F44336' }).showToast();
  }
}

// ========== FUNCIONES AUXILIARES ==========

function setupMenuNavigation() {
  document.querySelectorAll('nav a').forEach(link => {
    if (link.getAttribute('href').startsWith('#')) {
      link.addEventListener('click', e => {
        e.preventDefault();
        const tid = link.getAttribute('href').substring(1);
        document.querySelectorAll('[id$=\"-section\"]').forEach(sec => {
          sec.style.display = sec.id === `${tid}-section` ? 'block' : 'none';
        });
      });
    }
  });
}

function abrirModal(id) {
  const m = document.getElementById(id);
  if (m) { m.style.display = 'flex'; document.body.style.overflow = 'hidden'; }
}

function cerrarModal(id) {
  const m = document.getElementById(id);
  if (m) { m.style.display = 'none'; document.body.style.overflow = 'auto'; }
}

function actualizarRazas() {
  const esp = document.getElementById('especieSelect'),
        raz = document.getElementById('raza');
  if (!raz) return;
  raz.innerHTML = '<option value=\"\">Seleccione especie primero</option>';
  if (!esp.value) return;
  (razasPorEspecie[esp.value]||[]).forEach(r => {
    const o = document.createElement('option');
    o.value = r.split(' ')[0];
    o.textContent = r;
    raz.appendChild(o);
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
      mostrarAlerta(`Complete el campo ${c}`,'error');
      return false;
    }
  }
  const em = document.getElementById('correo').value;
  if (!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(em)) {
    mostrarAlerta('Ingrese un correo válido','error');
    return false;
  }
  return true;
}

function mostrarAlerta(msg, tipo = 'info') {
  const colores = { success: '#4CAF50', error: '#F44336', info: '#2196F3' };
  Toastify({ text: msg, duration: 3000, backgroundColor: colores[tipo], close: true, gravity: 'top', position: 'right' }).showToast();
}

// ========== OTRAS FUNCIONES ==========

function mostrarCitasBonitas() {
  const lista = document.getElementById('appointments-list');
  const w     = window.open('', '_blank');
  w.document.write(`<html><head><title>Citas del día</title>
    <style>body{font-family:Arial;padding:20px}h2{color:#444}li{margin-bottom:15px;border-bottom:1px solid #ccc;padding-bottom:10px}</style>
    </head><body><h2>Citas programadas para hoy</h2><ul>${lista.innerHTML}</ul></body></html>`);
  w.document.close();
}

let calendarioInicializado = false;

function comenzar() {
  document.getElementById('daily-appointments').style.display = 'none';
  document.getElementById('calendar-container').style.display   = 'block';
  if (!calendarioInicializado) { initCalendar(); calendarioInicializado = true; }
}
