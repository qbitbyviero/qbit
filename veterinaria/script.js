const WEBAPP_URL = 'https://script.google.com/macros/s/AKfycbztH4mP_jjhB52a_MLwjDDgdles-xxndb01zRWOHLDYyRnh3th9WIrsAxsxuZzfwG57/exec';
let calendar;
let citasPendientes = [];
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
    const barkSound = document.getElementById('barkSound');
    setTimeout(async () => {
        document.getElementById('splash').style.display = 'none';
        document.getElementById('daily-appointments').style.display = 'block';
        
        document.body.addEventListener('click', function playSoundOnce() {
            barkSound.play().catch(e => console.log('Sonido omitido'));
            document.body.removeEventListener('click', playSoundOnce);
        });
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
                <head><title>Citas del Día - Posh Posh</title>
                <style>${document.querySelector('style').innerHTML}</style></head>
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
            body: JSON.stringify({
                action: 'guardarCliente',
                ...formData
            })
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
    document.getElementById('modalVacunas').style.display = 'block';
    document.body.style.overflow = 'hidden';
    cargarListaVacunas();
    actualizarRazas();
}

async function cargarListaVacunas() {
    try {
        const response = await fetch(`${WEBAPP_URL}?action=getVacunas`);
        if (!response.ok) throw new Error('Error al cargar vacunas');
        
        const data = await response.json();
        const select = document.getElementById('nombreVacuna');
        
        select.innerHTML = '<option value="">Seleccione una vacuna</option>';
        
        if (data.vacunas && data.vacunas.length > 0) {
            data.vacunas.forEach(vacuna => {
                const option = document.createElement('option');
                option.value = vacuna.nombre || vacuna;
                option.textContent = vacuna.nombre || vacuna;
                select.appendChild(option);
            });
        } else {
            console.warn('No se encontraron vacunas');
            select.innerHTML = '<option value="">No hay vacunas registradas</option>';
        }
    } catch (error) {
        console.error('Error al cargar vacunas:', error);
        mostrarAlerta('❌ Error al cargar lista de vacunas', 'error');
    }
}

async function guardarVacuna(event) {
    if (event) event.preventDefault();
    
    const btnGuardar = document.querySelector('#modalVacunas button[onclick="guardarVacuna()"]');
    const btnOriginalText = btnGuardar.innerHTML;
    btnGuardar.innerHTML = '⏳ Guardando...';
    btnGuardar.disabled = true;

    try {
        // Validación básica
        const nombreMascota = document.getElementById('nombreMascota').value.trim();
        const vacunaSeleccionada = document.getElementById('nombreVacuna').value;
        
        if (!nombreMascota || !vacunaSeleccionada) {
            mostrarAlerta('❌ Nombre de mascota y vacuna son requeridos', 'error');
            return;
        }

        // Preparar datos
        const datos = {
            action: 'guardarVacuna',
            nombreMascota: nombreMascota,
            nombreDueno: document.getElementById('nombreDueno')?.value.trim() || '',
            idCliente: document.getElementById('idCliente')?.value || 'N/A',
            idMascota: document.getElementById('idMascota')?.value || 'N/A',
            edad: document.getElementById('edad')?.value || '0',
            sexo: document.getElementById('genero')?.value || 'No especificado',
            peso: document.getElementById('peso')?.value || '0',
            especie: document.getElementById('especieSelect')?.value || 'No especificada',
            raza: document.getElementById('raza')?.value || 'No especificada',
            vacuna: vacunaSeleccionada,
            fechaAplicacion: document.getElementById('fechaAplicacion')?.value || new Date().toISOString().split('T')[0],
            fechaRefuerzo: document.getElementById('fechaRefuerzo')?.value || '',
            veterinario: document.getElementById('veterinario')?.value.trim() || 'No especificado',
            observaciones: document.getElementById('observaciones')?.value.trim() || 'Ninguna'
        };

        // Enviar datos
        const response = await fetch(WEBAPP_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(datos)
        });

        const resultado = await response.json();

        if (resultado.status !== 'success') {
            throw new Error(resultado.message || 'Error en el servidor');
        }

        mostrarAlerta('✅ Vacuna registrada correctamente', 'success');
        
        // Limpiar formulario
        document.getElementById('formVacuna').reset();
        
        // Cerrar modal después de 1 segundo
        setTimeout(() => {
            cerrarModal('modalVacunas');
        }, 1000);

    } catch (error) {
        console.error('Error al guardar vacuna:', error);
        mostrarAlerta(`❌ Error: ${error.message}`, 'error');
    } finally {
        btnGuardar.innerHTML = btnOriginalText;
        btnGuardar.disabled = false;
    }
}

// ========== FUNCIONES AUXILIARES ==========
function setupMenuNavigation() {
    document.querySelectorAll('nav a').forEach(link => {
        if (link.getAttribute('href').startsWith('#')) {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const targetId = link.getAttribute('href').substring(1);
                document.querySelectorAll('[id$="-section"]').forEach(section => {
                    section.style.display = section.id === `${targetId}-section` ? 'block' : 'none';
                });
            });
        }
    });
}

function abrirModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden';
    }
}

function cerrarModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
}

function actualizarRazas() {
    const especieSelect = document.getElementById("especieSelect");
    const razaSelect = document.getElementById("raza");
    
    if (!razaSelect) return;
    
    razaSelect.innerHTML = "<option value=''>Seleccione especie primero</option>";
    
    if (!especieSelect || !especieSelect.value) return;
    
    const razas = razasPorEspecie[especieSelect.value] || [];
    
    razas.forEach(raza => {
        const option = document.createElement("option");
        option.value = raza.split(' ')[0];
        option.textContent = raza;
        razaSelect.appendChild(option);
    });
}

function configurarSelectores() {
    document.addEventListener('change', function(e) {
        if (e.target.id === 'especieSelect') {
            actualizarRazas();
        }
    });
}

function validarFormulario() {
    const camposRequeridos = [
        'nombreDueno', 'direccion', 'telefono', 
        'correo', 'nombreMascota', 'edad', 'peso'
    ];
    
    for (const campoId of camposRequeridos) {
        const valor = document.getElementById(campoId).value.trim();
        if (!valor) {
            mostrarAlerta(`Complete el campo ${campoId.replace('nombre', '')}`, 'error');
            return false;
        }
    }
    
    const email = document.getElementById('correo').value;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        mostrarAlerta('Ingrese un correo válido', 'error');
        return false;
    }
    
    return true;
}

function mostrarAlerta(mensaje, tipo = 'info') {
    const colores = {
        success: '#4CAF50',
        error: '#F44336',
        info: '#2196F3'
    };
    
    Toastify({
        text: mensaje,
        duration: 3000,
        backgroundColor: colores[tipo],
        close: true,
        gravity: "top",
        position: "right"
    }).showToast();
}

// ========== OTRAS FUNCIONES EXISTENTES ==========
// (Mantén aquí todas tus otras funciones que no están relacionadas con vacunas)

function mostrarCitasBonitas() {
    const lista = document.getElementById('appointments-list');
    const nuevaVentana = window.open('', '_blank');
    nuevaVentana.document.write(`
        <html>
            <head>
                <title>Citas del día</title>
                <style>
                    body { font-family: Arial; padding: 20px; }
                    h2 { color: #444; }
                    li { margin-bottom: 15px; border-bottom: 1px solid #ccc; padding-bottom: 10px; }
                </style>
            </head>
            <body>
                <h2>Citas programadas para hoy</h2>
                <ul>${lista.innerHTML}</ul>
            </body>
        </html>
    `);
    nuevaVentana.document.close();
}

let calendarioInicializado = false;

function comenzar() {
    document.getElementById('daily-appointments').style.display = 'none';
    document.getElementById('calendar-container').style.display = 'block';

    if (!calendarioInicializado) {
        initCalendar();
        calendarioInicializado = true;
    }
}

let fechaSeleccionada = null;

function abrirModalNuevaCita(fecha) {
    fechaSeleccionada = fecha;
    document.getElementById('modalNuevaCita').style.display = 'block';
    document.body.style.overflow = 'hidden';
}

async function obtenerProductosDesdeBackend() {
    try {
        const response = await fetch(`${WEBAPP_URL}?action=getProductos`);
        if (!response.ok) throw new Error(`Error HTTP: ${response.status}`);
        
        const data = await response.json();
        if (!data.productos) throw new Error('Formato de datos inválido');

        productos = data.productos;
        categorias = [...new Set(productos.map(p => p.categoria))];

        const selectCategorias = document.getElementById('selector-categoria');
        if (selectCategorias) {
            selectCategorias.innerHTML = '';
            const defaultOption = document.createElement('option');
            defaultOption.value = 'todas';
            defaultOption.textContent = '-- Todas las categorías --';
            selectCategorias.appendChild(defaultOption);

            categorias.forEach(cat => {
                const option = document.createElement('option');
                option.value = cat;
                option.textContent = cat;
                selectCategorias.appendChild(option);
            });
        }

        mostrarProductos(productos);
    } catch (error) {
        console.error('Error al cargar productos:', error);
        mostrarAlerta('❌ Error al cargar productos. Recargue la página', 'error');
    }
}

async function guardarVacuna(event) {
    if (event) event.preventDefault();
    
    try {
        // Validación básica
        const nombreMascota = document.getElementById('nombreMascota').value;
        const vacunaSeleccionada = document.getElementById('nombreVacuna').value;
        if (!nombreMascota || !vacunaSeleccionada) {
            mostrarAlerta('❌ Nombre de mascota y vacuna son requeridos', 'error');
            return;
        }

        const datos = {
            action: 'guardarVacuna',
            nombreDueno: document.getElementById('nombreDueno')?.value || '',
            idCliente: document.getElementById('idCliente')?.value || 'N/A',
            idMascota: document.getElementById('idMascota')?.value || 'N/A',
            nombreMascota: nombreMascota,
            edad: document.getElementById('edad')?.value || '0',
            sexo: document.getElementById('genero')?.value || 'No especificado',
            peso: document.getElementById('peso')?.value || '0',
            especie: document.getElementById('especieSelect')?.value || 'No especificada',
            raza: document.getElementById('raza')?.value || 'No especificada',
            vacuna: vacunaSeleccionada,
            fechaAplicacion: document.getElementById('fechaAplicacion')?.value || new Date().toISOString().split('T')[0],
            fechaRefuerzo: document.getElementById('fechaRefuerzo')?.value || '',
            veterinario: document.getElementById('veterinario')?.value || 'No especificado',
            observaciones: document.getElementById('observaciones')?.value || 'Ninguna'
        };

        const response = await fetch(WEBAPP_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(datos)
        });

        const resultado = await response.json();

        if (resultado.status !== 'success') {
            throw new Error(resultado.message || 'Error en el servidor');
        }

        mostrarAlerta('✅ Vacuna registrada correctamente', 'success');
        
        // Actualizar interfaz si existe
        if (typeof agregarFilaTabla === 'function') {
            agregarFilaTabla(datos);
        }
        
        // Opcional: Recargar vacunas
        await cargarVacunas();
        
    } catch (error) {
        console.error('Error al guardar vacuna:', error);
        mostrarAlerta(`❌ Error: ${error.message}`, 'error');
    }
}
async function inicializarTienda() {
    try {
        // Configurar eventos
        document.getElementById('selector-categoria')?.addEventListener('change', filtrarProductos);
        document.getElementById('tipo-descuento')?.addEventListener('change', toggleDescuento);
        
        // Cargar productos
        await obtenerProductosDesdeBackend();
        
        // Inicializar carrito
        actualizarCarrito();
    } catch (error) {
        console.error('Error al inicializar tienda:', error);
    }
}

// Verificar si mascota ya existe
async function verificarMascotaExistente() {
  const nombreMascota = document.getElementById('mascotaInput').value.trim();
  if (!nombreMascota) return;

  const response = await fetch(`${WEBAPP_URL}?action=verificarMascota&nombreMascota=${encodeURIComponent(nombreMascota)}`);
  const resultado = await response.json();

  if (resultado.encontrado) {
    document.getElementById('duenoSugerido').textContent = resultado.dueno;
    document.getElementById('preguntaDueno').style.display = 'block';
  } else {
    document.getElementById('preguntaDueno').style.display = 'none';
    document.getElementById('campoNuevoDueno').style.display = 'block';
  }
}

function usarDuenoSugerido() {
  const sugerido = document.getElementById('duenoSugerido').textContent;
  document.getElementById('duenoInput').value = sugerido;
  document.getElementById('preguntaDueno').style.display = 'none';
  document.getElementById('campoNuevoDueno').style.display = 'none';
}

function pedirNuevoDueno() {
  document.getElementById('campoNuevoDueno').style.display = 'block';
  document.getElementById('preguntaDueno').style.display = 'none';
}

function cerrarModal(id) {
  document.getElementById(id).style.display = 'none';
  document.body.style.overflow = 'auto';
}

// Preparar y enviar datos de la cita
// 🔄 Fragmento que sustituye la función guardarNuevaCita
async function guardarNuevaCita() {
  const cita = {
    fecha: fechaSeleccionada,
    hora: document.getElementById('horaInput').value,
    paciente: document.getElementById('mascotaInput').value,
    cliente: document.getElementById('duenoInput').value,
    motivo: document.getElementById('motivoInput').value,
    estatus: document.getElementById('estatusInput').value,
    notas: document.getElementById('notasInput').value,
    costo: document.getElementById('costoInput').value
  };

  try {
    const response = await fetch(WEBAPP_URL, {
      method: 'POST',
      body: JSON.stringify({
        action: 'guardarCitaAvanzada',
        ...cita
      })
    });

    const resultado = await response.json();

    if (resultado.status === 'success') {
      cerrarModal('modalNuevaCita');
      mostrarAlerta('📌 Cita guardada correctamente', 'success');
      calendar.refetchEvents();

      // Abrir ticket (usando GET)
      const ticketURL = `${WEBAPP_URL}?action=verTicket&paciente=${encodeURIComponent(cita.paciente)}&cliente=${encodeURIComponent(cita.cliente)}&motivo=${encodeURIComponent(cita.motivo)}&costo=${encodeURIComponent(cita.costo)}`;
      window.open(ticketURL, '_blank', 'width=400,height=600');

    } else {
      throw new Error(resultado.message || 'Error al guardar la cita');
    }
  } catch (error) {
    console.error('Error:', error);
    mostrarAlerta('❌ Error al guardar la cita', 'error');
  }
}
// 1. Función para abrir el modal
function abrirHistorial() {
  document.getElementById('modalHistorial').style.display = 'block';
  document.body.style.overflow = 'hidden';
}

// 2. Función para guardar 
function guardarHistorial() {
  alert("💾 Aquí conectarás el guardado con la hoja 'Historial'");
}

// 3. Asegúrate que el botón de cierre llame a:
function cerrarModalHistorial() {
  document.getElementById('modalHistorial').style.display = 'none';
  document.body.style.overflow = 'auto';
}
function cerrarSecciones() {
  ['vacuna-section','tienda-section','estetica-section'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });
  document.body.style.overflow = 'auto';
}

// Abre la sección de vacunas
function abrirVacuna() {
  cerrarSecciones();
  const s = document.getElementById('vacuna-section');
  if (s) {
    s.style.display = 'block';
    document.body.style.overflow = 'hidden';
  }
}

// Abre la sección de estética
function abrirEstetica() {
  cerrarSecciones();
  const s = document.getElementById('estetica-section');
  if (s) {
    s.style.display = 'block';
    document.body.style.overflow = 'hidden';
  }
}
let carrito = [];
let productos = [];
let categorias = [];

// Función para inicializar la tienda
function inicializarTienda() {
  console.log("Inicializando tienda...");
  
  // 1. Configurar eventos
  document.getElementById('selector-categoria').addEventListener('change', filtrarProductos);
  document.getElementById('tipo-descuento').addEventListener('change', toggleDescuento);
  
  // 2. Obtener datos desde Google Sheets (ahora utilizando el backend)
  obtenerProductosDesdeBackend();
  
  // 3. Actualizar interfaz
  actualizarCarrito();
}

// Función para obtener productos desde el backend (Google Apps Script)
function obtenerProductosDesdeBackend() {
  const url = 'https://script.google.com/macros/s/AKfycbztH4mP_jjhB52a_MLwjDDgdles-xxndb01zRWOHLDYyRnh3th9WIrsAxsxuZzfwG57/exec?action=getProductos';
  
  fetch(url)
    .then(response => response.json())
    .then(data => {
      productos = data.productos;
      
      // Obtener categorías únicas
      categorias = [...new Set(productos.map(p => p.categoria))];
      
      // Llenar el selector de categorías
      const selectCategorias = document.getElementById('selector-categoria');
      categorias.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat;
        option.textContent = cat;
        selectCategorias.appendChild(option);
      });
      
      // Mostrar todos los productos inicialmente
      mostrarProductos(productos);
    })
    .catch(error => {
      console.error('Error al cargar los datos del backend:', error);
    });
}

// Mostrar productos filtrados
function mostrarProductos(productosMostrar) {
  const contenedor = document.getElementById('contenedor-categorias');
  contenedor.innerHTML = '';
  
  const grid = document.createElement('div');
  grid.className = 'grid-productos';
  
  productosMostrar.forEach(producto => {
    const card = document.createElement('div');
    card.className = 'producto-card';
    card.innerHTML = `
      <h4>${producto.nombre}</h4>
      <p>$${producto.precio.toFixed(2)}</p>
      <button onclick="agregarAlCarrito(${producto.id})" class="boton-agregar">➕ Añadir</button>
    `;
    grid.appendChild(card);
  });
  
  contenedor.appendChild(grid);
}

// Filtrar productos según la categoría seleccionada
function filtrarProductos() {
  const categoriaSeleccionada = document.getElementById('selector-categoria').value;
  
  if (categoriaSeleccionada === 'todas') {
    mostrarProductos(productos);
  } else {
    const productosFiltrados = productos.filter(p => p.categoria === categoriaSeleccionada);
    mostrarProductos(productosFiltrados);
  }
}

// Función para agregar al carrito
function agregarAlCarrito(idProducto) {
  const producto = productos.find(p => p.id === idProducto);
  if (!producto) return;
  
  const itemExistente = carrito.find(item => item.id === idProducto);
  
  if (itemExistente) {
    itemExistente.cantidad++;
  } else {
    carrito.push({ ...producto, cantidad: 1 });
  }
  
  actualizarCarrito();
  mostrarAlerta(`✅ ${producto.nombre} añadido al carrito`, 'success');
}

// Función para actualizar el carrito
function actualizarCarrito() {
  const listaCarrito = document.getElementById('lista-carrito');
  const totalElement = document.getElementById('total-venta');
  
  listaCarrito.innerHTML = '';
  
  let total = 0;
  
  carrito.forEach(item => {
    const subtotal = item.precio * item.cantidad;
    total += subtotal;
    
    const elemento = document.createElement('div');
    elemento.className = 'item-carrito';
    elemento.innerHTML = `
      <span>${item.nombre} x${item.cantidad}</span>
      <span>$${subtotal.toFixed(2)}</span>
      <button onclick="eliminarDelCarrito(${item.id})" class="btn-eliminar">❌</button>
    `;
    listaCarrito.appendChild(elemento);
  });
  
  totalElement.textContent = total.toFixed(2);
}

// Eliminar del carrito
function eliminarDelCarrito(idProducto) {
  carrito = carrito.filter(item => item.id !== idProducto);
  actualizarCarrito();
}

// Cambiar el estado del descuento
function toggleDescuento() {
  const tipoDescuento = document.getElementById('tipo-descuento').value;
  const inputDescuento = document.getElementById('valor-descuento');
  
  inputDescuento.disabled = tipoDescuento === 'ninguno';
}

// Procesar la venta
function procesarVenta() {
  if (carrito.length === 0) {
    mostrarAlerta('🛒 El carrito está vacío', 'error');
    return;
  }
  
  // Aquí iría la lógica para procesar la venta
  mostrarAlerta('✅ Venta procesada correctamente', 'success');
  carrito = [];
  actualizarCarrito();
}

function cargarYMostrarModal(archivo, idModal) {
    fetch(archivo)
        .then(res => res.text())
        .then(html => {
            document.getElementById("modales-container").innerHTML = html;
            const modal = document.getElementById(idModal);
            if (modal) {
                modal.style.display = "block";
                
                // Llama a cargarListaVacunas() SOLO si es el modal de vacunas
                if (idModal === 'modalVacunas') {
                    cargarListaVacunas();
                }
            }
        })
        .catch(err => console.error("Error al cargar el modal:", err));
}
  
  function cerrarModal(idModal) {
    const modal = document.getElementById(idModal);
    if (modal) modal.style.display = "none";
  }  
  function guardarEstetica() {
    // Obtener los valores de los inputs
    const mascota = document.getElementById('esteticaMascota').value;
    const servicio = document.getElementById('esteticaServicio').value;
    const fecha = document.getElementById('esteticaFecha').value;
    const costo = document.getElementById('esteticaCosto').value;
    const estilista = document.getElementById('esteticaEstilista').value;
    const notas = document.getElementById('esteticaNotas').value;

    // Foto antes y después (puedes hacer algo con las imágenes, pero aquí solo los nombres como ejemplo)
    const fotoAntes = document.getElementById('fotoAntes').files[0] ? document.getElementById('fotoAntes').files[0].name : "No disponible";
    const fotoDespues = document.getElementById('fotoDespues').files[0] ? document.getElementById('fotoDespues').files[0].name : "No disponible";

    // Crear la nueva fila para la tabla de historial
    const tabla = document.getElementById('tablaEstetica').getElementsByTagName('tbody')[0];
    const nuevaFila = tabla.insertRow();

    nuevaFila.innerHTML = `
        <td>${mascota}</td>
        <td>${servicio}</td>
        <td>${fecha}</td>
        <td>${costo} 💲</td>
        <td>${estilista}</td>
        <td>📸 Antes: ${fotoAntes} / Después: ${fotoDespues}</td>
        <td>${notas}</td>
        <td><button onclick="eliminarFila(this)">🗑️</button></td>
    `;

    // Limpiar los campos
    document.getElementById('esteticaMascota').value = '';
    document.getElementById('esteticaServicio').value = '';
    document.getElementById('esteticaFecha').value = '';
    document.getElementById('esteticaCosto').value = '';
    document.getElementById('esteticaEstilista').value = '';
    document.getElementById('esteticaNotas').value = '';
    document.getElementById('fotoAntes').value = '';
    document.getElementById('fotoDespues').value = '';
}

function eliminarFila(button) {
    // Eliminar la fila donde se encuentra el botón
    const row = button.closest('tr');
    row.remove();
}
function guardarEstetica(event) {
    event.preventDefault();
  
    const datos = {
      nombreMascota: document.getElementById("nombreMascotaEstetica").value,
      nombreDueno: document.getElementById("nombreDuenoEstetica").value,
      servicio: document.getElementById("servicioRealizado").value,
      fecha: document.getElementById("fechaServicio").value,
      costo: document.getElementById("costoServicio").value,
      estilista: document.getElementById("estilista").value,
      productos: document.getElementById("productosUsados").value,
      notas: document.getElementById("notasEstetica").value,
      // Las fotos se manejarán por separado
    };
  
    google.script.run
      .withSuccessHandler(() => {
        alert("Registro de estética guardado exitosamente.");
        cerrarModal('modalEstetica');
      })
      .withFailureHandler((error) => {
        alert("Error al guardar el registro: " + error.message);
      })
      .guardarRegistroEstetica(datos);
  }  
  function cargarVacunas() {
    fetch('https://script.google.com/macros/s/AKfycbztH4mP_jjhB52a_MLwjDDgdles-xxndb01zRWOHLDYyRnh3th9WIrsAxsxuZzfwG57/exec?action=getVacunas')
      .then(res => res.json())
      .then(data => {
        const select = document.getElementById('nombreVacuna');
        select.innerHTML = '<option value="">Seleccione una vacuna</option>';
        data.vacunas.forEach(nombre => {
          const option = document.createElement('option');
          option.value = nombre;
          option.textContent = nombre;
          select.appendChild(option);
        });
      })
      .catch(err => {
        console.error('Error al cargar vacunas:', err);
        const select = document.getElementById('nombreVacuna');
        select.innerHTML = '<option value="">Error al cargar vacunas</option>';
      });
  }
  function cargarVacunas(idCliente, idMascota) {
    fetch(`https://script.google.com/macros/s/AKfycbztH4mP_jjhB52a_MLwjDDgdles-xxndb01zRWOHLDYyRnh3th9WIrsAxsxuZzfwG57/exec?idCliente=${idCliente}&idMascota=${idMascota}`)
      .then(res => res.json())
      .then(data => {
        const tabla = document.querySelector('#tablaVacunas tbody');
        tabla.innerHTML = ''; // limpiar tabla
  
        if (data.status === 'success' && data.vacunas.length > 0) {
          data.vacunas.forEach(vac => {
            const fila = document.createElement('tr');
            fila.innerHTML = `
              <td>${vac.vacuna}</td>
              <td>${vac.fechaAplicacion}</td>
              <td>${vac.fechaRefuerzo}</td>
              <td>${vac.veterinario}</td>
              <td>${vac.observaciones}</td>
              <td><button onclick="this.closest('tr').remove()">❌</button></td>
            `;
            tabla.appendChild(fila);
          });
        } else {
          const fila = document.createElement('tr');
          fila.innerHTML = `<td colspan="6">Sin vacunas registradas</td>`;
          tabla.appendChild(fila);
        }
      })
      .catch(error => {
        console.error('Error al cargar vacunas:', error);
      });
  }
  function guardarClienteEnHistorial(datos) {
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID);  // Asegúrate de tener el ID de tu hoja de cálculo
    const historialSheet = sheet.getSheetByName('Historial');
  
    const clienteRow = [
      new Date(),                   // Fecha de registro
      datos.num_historia,           // Número de historia (si es requerido)
      datos.fecha,                  // Fecha de consulta
      datos.cliente_id,             // ID del cliente
      datos.nombre_dueno,           // Nombre del dueño
      datos.direccion,              // Dirección del dueño
      datos.telefono,               // Teléfono del dueño
      datos.correo,                 // Correo electrónico del dueño
      datos.nombre_mascota,         // Nombre de la mascota
      datos.especie,                // Especie de la mascota
      datos.raza,                   // Raza de la mascota
      datos.sexo,                   // Sexo de la mascota
      datos.edad,                   // Edad de la mascota
      datos.peso,                   // Peso de la mascota
      datos.temperatura,            // Temperatura de la mascota
      datos.pulso,                  // Pulso de la mascota
      datos.cardiaca,               // Frecuencia cardíaca de la mascota
      datos.respiratoria,           // Frecuencia respiratoria
      datos.estado_general,         // Estado general de la mascota
      datos.capilar,                // Llenado capilar de la mascota
      datos.ojos,                   // Observaciones de los ojos
      datos.tegumentario,           // Estado tegumentario
      datos.hidratacion,            // Nivel de hidratación
      datos.diagnostico,            // Diagnóstico del veterinario
      datos.tratamiento,            // Tratamiento recomendado
      datos.observaciones,          // Otras observaciones
      datos.servicios,              // Servicios proporcionados
      datos.costo_total             // Costo total
    ];
  
    historialSheet.appendRow(clienteRow); // Agregamos la fila a la hoja
  
    return 'Cliente guardado exitosamente en Historial';
  }
  function guardarVacunaEnHistorial(datos) {
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    const historialSheet = sheet.getSheetByName('Historial');
  
    const vacunaRow = [
      new Date(),                   // Fecha de registro
      datos.idCliente,               // ID del cliente
      datos.nombreDueno,             // Nombre del dueño
      datos.idMascota,               // ID de la mascota
      datos.nombreMascota,           // Nombre de la mascota
      datos.edad,                    // Edad de la mascota
      datos.sexo,                    // Sexo de la mascota
      datos.peso,                    // Peso de la mascota
      datos.especie,                 // Especie de la mascota
      datos.raza,                    // Raza de la mascota
      datos.vacuna,                  // Vacuna aplicada
      datos.fechaAplicacion,         // Fecha de aplicación
      datos.fechaRefuerzo,           // Fecha de refuerzo (si aplica)
      datos.veterinario,             // Nombre del veterinario
      datos.observaciones            // Observaciones
    ];
  
    historialSheet.appendRow(vacunaRow); // Agregamos la fila a la hoja
  
    return 'Vacuna guardada exitosamente en Historial';
  }
  function guardarCitaEnHistorial(datos) {
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    const historialSheet = sheet.getSheetByName('Historial');
  
    const citaRow = [
      new Date(),                   // Fecha de registro
      datos.fecha || '',             // Fecha de la cita
      datos.hora || '',              // Hora de la cita
      datos.cliente || '',           // Cliente asociado
      datos.paciente || '',          // Mascota asociada
      datos.motivo || '',            // Motivo de la cita
      datos.estatus || 'Activa',     // Estatus de la cita
      datos.notas || '',             // Notas adicionales
      'sin-foto.jpg',                // Foto asociada (puede dejarse como un valor por defecto)
      datos.costo || 0               // Costo de la cita
    ];
  
    historialSheet.appendRow(citaRow);  // Agregamos la fila a la hoja
  
    return 'Cita guardada exitosamente en Historial';
  }
document.addEventListener('DOMContentLoaded', initApp);
window.addEventListener('click', (event) => {
    if (event.target.className === 'modal') {
        event.target.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
});
async function cargarHistorialVacunas(idCliente, idMascota) {
    try {
        const response = await fetch(`${WEBAPP_URL}?action=getHistorialVacunas&idCliente=${idCliente}&idMascota=${idMascota}`);
        const data = await response.json();
        const tabla = document.querySelector('#tablaVacunas tbody');
        
        tabla.innerHTML = '';
        
        if (data.status === 'success' && data.vacunas.length > 0) {
            data.vacunas.forEach(vac => {
                const fila = document.createElement('tr');
                fila.innerHTML = `
                    <td>${vac.vacuna}</td>
                    <td>${new Date(vac.fechaAplicacion).toLocaleDateString()}</td>
                    <td>${vac.fechaRefuerzo ? new Date(vac.fechaRefuerzo).toLocaleDateString() : '---'}</td>
                    <td>${vac.veterinario}</td>
                    <td>${vac.observaciones}</td>
                    <td><button onclick="this.closest('tr').remove()">❌</button></td>
                `;
                tabla.appendChild(fila);
            });
        } else {
            const fila = document.createElement('tr');
            fila.innerHTML = `<td colspan="6">Sin vacunas registradas</td>`;
            tabla.appendChild(fila);
        }
    } catch (error) {
        console.error('Error al cargar historial de vacunas:', error);
        mostrarAlerta('Error al cargar historial de vacunas', 'error');
    }
}

// Asegúrate que solo tengas un evento DOMContentLoaded al final:
document.addEventListener('DOMContentLoaded', () => {
    initApp();
    
    // Manejo de cierre de modales
    window.addEventListener('click', (event) => {
        if (event.target.className === 'modal') {
            event.target.style.display = 'none';
            document.body.style.overflow = 'auto';
        }
    });
});
