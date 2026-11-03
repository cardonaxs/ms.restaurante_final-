// ============================================================
// CONFIGURACIÓN
// ============================================================
// La API usa el mismo origen; nginx reenvía /api al gateway.
const API_URL = '';

const ESTADOS = ['pendiente', 'en_preparacion', 'servido', 'pagado', 'cancelado'];
const ESTADO_BADGE = {
  pendiente: 'warning',
  en_preparacion: 'info',
  servido: 'primary',
  pagado: 'success',
  cancelado: 'secondary'
};
const ROL_BADGE = { admin: 'danger', mesero: 'primary', cocinero: 'warning', cliente: 'secondary' };

// Estos permisos controlan la interfaz; el backend también valida cada operación.
const PERMISOS = {
  admin:    { tabs: ['usuarios', 'menu', 'ordenes'], usuariosEditar: true,  menuEditar: true,  pedidoCrear: true,  pedidoEstado: true,  pedidoEliminar: true },
  mesero:   { tabs: ['menu', 'ordenes'],             usuariosEditar: false, menuEditar: false, pedidoCrear: true,  pedidoEstado: true,  pedidoEliminar: false },
  cocinero: { tabs: ['menu', 'ordenes'],             usuariosEditar: false, menuEditar: false, pedidoCrear: false, pedidoEstado: true,  pedidoEliminar: false },
  cliente:  { tabs: ['menu', 'ordenes'],             usuariosEditar: false, menuEditar: false, pedidoCrear: true,  pedidoEstado: false, pedidoEliminar: false }
};

const TITULOS = {
  usuarios: 'Gestión de usuarios',
  menu: 'Menú / Platos',
  ordenes: 'Órdenes'
};

const state = { token: null, user: null, usuarios: [], menu: [], pedidos: [], tab: null };
const modales = {};

// Los modales se crean solo cuando se necesitan, así el login y el registro
// funcionan aunque Bootstrap (CDN) no haya cargado.
function modalDe(id) {
  if (typeof bootstrap === 'undefined') {
    throw new Error('Bootstrap no cargó (revisa tu conexión a internet) y no se puede abrir la ventana.');
  }
  if (!modales[id]) modales[id] = new bootstrap.Modal($(id));
  return modales[id];
}

// ============================================================
// UTILIDADES
// ============================================================
const $ = (id) => document.getElementById(id);
const can = () => PERMISOS[state.user && state.user.rol] || PERMISOS.cliente;

const esc = (v) =>
  String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const money = (n) => '$' + Number(n || 0).toLocaleString('es-CO');
const fmtDate = (s) => (s ? new Date(s).toLocaleString('es-CO') : '');
const prettyEstado = (e) => String(e || '').replace(/_/g, ' ');

function toast(msg, type = 'success') {
  const el = document.createElement('div');
  el.className = `alert alert-${type} shadow-sm mb-2`;
  el.textContent = msg;
  $('toast-area').appendChild(el);
  setTimeout(() => el.remove(), 4000);
}

// Botón del "ojito": muestra / oculta la contraseña
function togglePassword(inputId, btn) {
  const input = $(inputId);
  const mostrar = input.type === 'password';
  input.type = mostrar ? 'text' : 'password';
  const icon = btn.querySelector('i');
  icon.classList.toggle('bi-eye', !mostrar);
  icon.classList.toggle('bi-eye-slash', mostrar);
}

function tokenExpirado(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return payload.exp * 1000 < Date.now();
  } catch {
    return true;
  }
}

// ============================================================
// API (todo pasa por el gateway)
// ============================================================
async function api(path, { method = 'GET', body, auth = true } = {}) {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (auth && state.token) headers['Authorization'] = `Bearer ${state.token}`;

  let res;
  try {
    res = await fetch(API_URL + path, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined
    });
  } catch (e) {
    throw new Error(
      'No se pudo conectar con el servidor. Revisa que Docker esté corriendo y que el puerto 8080 esté en Public en Codespaces.'
    );
  }

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    // Token vencido o inválido (lo responde el gateway en rutas protegidas)
    if (auth && (res.status === 401 || res.status === 403)) {
      logout('Tu sesión expiró o no es válida. Inicia sesión de nuevo.');
    }
    throw new Error((data && (data.mensaje || data.error)) || `Error ${res.status}`);
  }
  return data;
}

// ============================================================
// SESIÓN
// ============================================================
function guardarSesion(token, user) {
  state.token = token;
  state.user = user;
  localStorage.setItem('token', token);
  localStorage.setItem('usuario', JSON.stringify(user));
}

function limpiarSesion() {
  state.token = null;
  state.user = null;
  localStorage.removeItem('token');
  localStorage.removeItem('usuario');
}

function logout(mensaje) {
  limpiarSesion();
  $('dashboard-view').classList.add('hidden');
  $('auth-view').classList.remove('hidden');
  $('login-form').reset();
  setAuthMode('login');
  if (mensaje) showAuthMsg('error', mensaje);
}

// ============================================================
// AUTH: LOGIN / REGISTRO
// ============================================================
function showAuthMsg(tipo, msg) {
  clearAuthMsg();
  const el = $(tipo === 'error' ? 'auth-error' : 'auth-success');
  el.textContent = msg;
  el.classList.remove('hidden');
}

function clearAuthMsg() {
  $('auth-error').classList.add('hidden');
  $('auth-success').classList.add('hidden');
}

function setAuthMode(mode) {
  const login = mode === 'login';
  $('login-form').classList.toggle('hidden', !login);
  $('register-form').classList.toggle('hidden', login);
  $('auth-title').textContent = login ? 'Iniciar sesión' : 'Registrar usuario';
  clearAuthMsg();
}

async function onLogin(e) {
  e.preventDefault();
  clearAuthMsg();
  const btn = $('login-btn');
  btn.disabled = true;
  try {
    const data = await api('/api/usuarios/login', {
      method: 'POST',
      auth: false,
      body: { email: $('login-email').value.trim(), password: $('login-password').value }
    });
    guardarSesion(data.token, data.usuario);
    entrarAlDashboard();
  } catch (err) {
    showAuthMsg('error', err.message);
  } finally {
    btn.disabled = false;
  }
}

async function onRegister(e) {
  e.preventDefault();
  clearAuthMsg();
  const btn = $('register-btn');
  btn.disabled = true;
  const email = $('reg-email').value.trim();
  try {
    await api('/api/usuarios', {
      method: 'POST',
      auth: false,
      body: {
        nombre: $('reg-nombre').value.trim(),
        email,
        password: $('reg-password').value
      }
    });
    $('register-form').reset();
    setAuthMode('login');
    $('login-email').value = email;
    showAuthMsg('success', 'Usuario registrado. Ya puedes iniciar sesión.');
  } catch (err) {
    showAuthMsg('error', err.message);
  } finally {
    btn.disabled = false;
  }
}

// ============================================================
// DASHBOARD
// ============================================================
function entrarAlDashboard() {
  $('auth-view').classList.add('hidden');
  $('dashboard-view').classList.remove('hidden');

  const permisos = can();
  $('user-badge').textContent = `${state.user.nombre} · ${state.user.rol}`;
  document.querySelectorAll('[data-tab-item]').forEach((li) => {
    li.classList.toggle('hidden', !permisos.tabs.includes(li.dataset.tabItem));
  });
  switchTab(permisos.tabs[0]);
}

function switchTab(tab) {
  if (!can().tabs.includes(tab)) return;
  state.tab = tab;
  $('tab-title').textContent = TITULOS[tab];
  document.querySelectorAll('[data-tab]').forEach((a) => a.classList.toggle('active', a.dataset.tab === tab));
  document.querySelectorAll('.content-section').forEach((s) => s.classList.add('hidden'));
  $('section-' + tab).classList.remove('hidden');
  loadData(tab);
}

async function loadData(tab) {
  const cont = $('data-' + tab);
  try {
    if (tab === 'usuarios') await cargarUsuarios();
    if (tab === 'menu') await cargarMenu();
    if (tab === 'ordenes') await cargarOrdenes();
  } catch (err) {
    cont.innerHTML = `<div class="alert alert-danger">${esc(err.message)}</div>`;
  }
}

// ------------------------------------------------------------
// Formularios genéricos en modal
// ------------------------------------------------------------
function campoHtml(f, valor) {
  const id = 'f-' + f.name;
  const req = f.required ? 'required' : '';
  const v = valor ?? f.default ?? '';
  let input = '';
  if (f.type === 'select') {
    input = `<select id="${id}" class="form-select" ${req}>${f.options
      .map((o) => `<option value="${esc(o.value)}" ${String(o.value) === String(v) ? 'selected' : ''}>${esc(o.label)}</option>`)
      .join('')}</select>`;
  } else if (f.type === 'textarea') {
    input = `<textarea id="${id}" class="form-control" rows="2" ${req}>${esc(v)}</textarea>`;
  } else if (f.type === 'checkbox') {
    const checked = valor === undefined ? f.default !== false : Boolean(Number(valor));
    return `<div class="form-check mb-3"><input type="checkbox" id="${id}" class="form-check-input" ${checked ? 'checked' : ''}>
            <label class="form-check-label" for="${id}">${esc(f.label)}</label></div>`;
  } else if (f.type === 'password') {
    input = `<div class="input-group">
               <input type="password" id="${id}" class="form-control" minlength="6" autocomplete="new-password" ${req}>
               <button type="button" class="btn btn-outline-secondary" onclick="togglePassword('${id}', this)" aria-label="Mostrar u ocultar contraseña"><i class="bi bi-eye"></i></button>
             </div>`;
  } else {
    const extra = f.type === 'number' ? `step="${f.step || 'any'}" min="${f.min ?? 0}"` : '';
    input = `<input type="${f.type || 'text'}" id="${id}" class="form-control" value="${esc(v)}" ${extra} ${req}>`;
  }
  return `<div class="mb-3"><label class="form-label" for="${id}">${esc(f.label)}</label>${input}</div>`;
}

function leerCampos(fields) {
  const data = {};
  fields.forEach((f) => {
    const el = $('f-' + f.name);
    if (f.type === 'checkbox') data[f.name] = el.checked ? 1 : 0;
    else if (f.type === 'number') data[f.name] = el.value === '' ? null : Number(el.value);
    else if (f.type === 'password') data[f.name] = el.value;
    else data[f.name] = el.value.trim();
  });
  return data;
}

// opciones: { title, fields | html, collect, values, submitText, onSubmit }
function abrirFormulario(opts) {
  $('form-modal-title').textContent = opts.title;
  $('form-modal-body').innerHTML = opts.html || opts.fields.map((f) => campoHtml(f, (opts.values || {})[f.name])).join('');
  $('form-modal-submit').textContent = opts.submitText || 'Guardar';
  $('form-modal-error').classList.add('hidden');

  $('form-modal-form').onsubmit = async (e) => {
    e.preventDefault();
    const btn = $('form-modal-submit');
    btn.disabled = true;
    try {
      const data = opts.collect ? opts.collect() : leerCampos(opts.fields);
      await opts.onSubmit(data);
      modalDe('form-modal').hide();
    } catch (err) {
      $('form-modal-error').textContent = err.message;
      $('form-modal-error').classList.remove('hidden');
    } finally {
      btn.disabled = false;
    }
  };
  modalDe('form-modal').show();
}

function abrirInfo(titulo, html) {
  $('info-modal-title').textContent = titulo;
  $('info-modal-body').innerHTML = html;
  modalDe('info-modal').show();
}

// ------------------------------------------------------------
// USUARIOS
// ------------------------------------------------------------
const CAMPOS_USUARIO_ROL = {
  name: 'rol',
  label: 'Rol',
  type: 'select',
  required: true,
  options: [
    { value: 'cliente', label: 'Cliente' },
    { value: 'mesero', label: 'Mesero' },
    { value: 'cocinero', label: 'Cocinero' },
    { value: 'admin', label: 'Administrador' }
  ]
};

async function cargarUsuarios() {
  state.usuarios = await api('/api/usuarios');
  const editar = can().usuariosEditar;

  const filas = state.usuarios
    .map(
      (u) => `<tr>
        <td>${u.id}</td>
        <td>${esc(u.nombre)}</td>
        <td>${esc(u.email)}</td>
        <td><span class="badge text-bg-${ROL_BADGE[u.rol] || 'secondary'}">${esc(u.rol)}</span></td>
        <td>${fmtDate(u.created_at)}</td>
        ${
          editar
            ? `<td class="text-end text-nowrap">
                 <button class="btn btn-sm btn-outline-primary" onclick="editarUsuario(${u.id})">Editar</button>
                 <button class="btn btn-sm btn-outline-danger" onclick="eliminarUsuario(${u.id})">Eliminar</button>
               </td>`
            : ''
        }
      </tr>`
    )
    .join('');

  $('data-usuarios').innerHTML = `
    <div class="d-flex gap-2 mb-3">
      <button class="btn btn-outline-secondary" onclick="loadData('usuarios')">Actualizar lista</button>
      ${editar ? '<button class="btn btn-success" onclick="nuevoUsuario()">+ Nuevo usuario</button>' : ''}
    </div>
    <div class="card"><div class="table-responsive">
      <table class="table table-hover align-middle mb-0">
        <thead><tr><th>ID</th><th>Nombre</th><th>Email</th><th>Rol</th><th>Creado</th>${editar ? '<th></th>' : ''}</tr></thead>
        <tbody>${filas || '<tr><td colspan="6" class="text-center text-muted py-4">No hay usuarios registrados.</td></tr>'}</tbody>
      </table>
    </div></div>`;
}

function nuevoUsuario() {
  abrirFormulario({
    title: 'Nuevo usuario',
    submitText: 'Crear usuario',
    fields: [
      { name: 'nombre', label: 'Nombre completo', required: true },
      { name: 'email', label: 'Email', type: 'email', required: true },
      { name: 'password', label: 'Contraseña', type: 'password', required: true },
      CAMPOS_USUARIO_ROL
    ],
    values: { rol: 'mesero' },
    onSubmit: async (data) => {
      await api('/api/usuarios/admin', { method: 'POST', body: data });
      toast('Usuario creado');
      cargarUsuarios();
    }
  });
}

function editarUsuario(id) {
  const u = state.usuarios.find((x) => Number(x.id) === Number(id));
  if (!u) return;
  abrirFormulario({
    title: `Editar usuario #${u.id}`,
    fields: [
      { name: 'nombre', label: 'Nombre completo', required: true },
      { name: 'email', label: 'Email', type: 'email', required: true },
      CAMPOS_USUARIO_ROL
    ],
    values: u,
    onSubmit: async (data) => {
      const r = await api(`/api/usuarios/${u.id}`, { method: 'PUT', body: data });
      toast(r.mensaje || 'Usuario actualizado');
      // Si me edité a mí misma, actualizo lo que muestra la interfaz
      if (Number(u.id) === Number(state.user.id)) {
        guardarSesion(state.token, { ...state.user, nombre: data.nombre, email: data.email, rol: data.rol });
        entrarAlDashboard();
      } else {
        cargarUsuarios();
      }
    }
  });
}

async function eliminarUsuario(id) {
  if (Number(id) === Number(state.user.id)) {
    return toast('No puedes eliminar tu propio usuario mientras estás conectada.', 'warning');
  }
  if (!confirm('¿Eliminar este usuario? También se eliminarán sus pedidos.')) return;
  try {
    await api(`/api/usuarios/${id}`, { method: 'DELETE' });
    toast('Usuario eliminado');
    cargarUsuarios();
  } catch (err) {
    toast(err.message, 'danger');
  }
}

// ------------------------------------------------------------
// MENÚ
// ------------------------------------------------------------
async function cargarMenu() {
  const [menu, categorias] = await Promise.all([
    api('/api/menu' + (state.user?.rol === 'admin' ? '?incluirNoDisponibles=true' : '')),
    api('/api/menu/categorias')
  ]);
  state.menu = menu;
  const editar = can().menuEditar;
  const nombreCategoria = (id) =>
    categorias.find((categoria) => Number(categoria.id) === Number(id))?.nombre || '';

  const filas = state.menu
    .map(
      (p) => `<tr>
        <td>${p.id}</td>
        <td>${esc(p.nombre)}</td>
        <td>${esc(p.descripcion)}</td>
        <td>${money(p.precio)}</td>
        <td>${esc(nombreCategoria(p.categoria_id))}</td>
        <td>${Number(p.disponible) ? '<span class="badge text-bg-success">Disponible</span>' : '<span class="badge text-bg-secondary">Agotado</span>'}</td>
        ${
          editar
            ? `<td class="text-end text-nowrap">
                 <button class="btn btn-sm btn-outline-primary" onclick="editarProducto(${p.id})">Editar</button>
                 <button class="btn btn-sm btn-outline-danger" onclick="eliminarProducto(${p.id})">Eliminar</button>
               </td>`
            : ''
        }
      </tr>`
    )
    .join('');

  $('data-menu').innerHTML = `
    <div class="d-flex gap-2 mb-3">
      <button class="btn btn-outline-secondary" onclick="loadData('menu')">Actualizar menú</button>
      ${editar ? '<button class="btn btn-success" onclick="nuevoProducto()">+ Nuevo plato</button>' : ''}
      ${editar ? '<button class="btn btn-outline-success" onclick="nuevaCategoria()">+ Nueva categoría</button>' : ''}
    </div>
    <div class="card"><div class="table-responsive">
      <table class="table table-hover align-middle mb-0">
        <thead><tr><th>ID</th><th>Plato</th><th>Descripción</th><th>Precio</th><th>Categoría</th><th>Estado</th>${editar ? '<th></th>' : ''}</tr></thead>
        <tbody>${filas || '<tr><td colspan="7" class="text-center text-muted py-4">No hay platos disponibles en el menú.</td></tr>'}</tbody>
      </table>
    </div></div>
    ${editar ? '' : '<p class="text-muted small mt-2">Solo se listan los platos disponibles.</p>'}`;
}

function nuevaCategoria() {
  abrirFormulario({
    title: 'Nueva categoría',
    submitText: 'Crear categoría',
    fields: [{ name: 'nombre', label: 'Nombre de la categoría', required: true }],
    onSubmit: async ({ nombre }) => {
      const categoria = await api('/api/menu/categorias', {
        method: 'POST',
        body: { nombre }
      });
      toast(`Categoría "${categoria.nombre}" creada`);
      await cargarMenu();
    }
  });
}

function camposProducto(categorias) {
  return [
    { name: 'nombre', label: 'Nombre del plato', required: true },
    { name: 'descripcion', label: 'Descripción', type: 'textarea' },
    { name: 'precio', label: 'Precio', type: 'number', step: '0.01', min: 0, required: true },
    {
      name: 'categoria_id',
      label: 'Categoría',
      type: 'select',
      options: [
        { value: '', label: 'Sin categoría' },
        ...categorias.map((categoria) => ({ value: categoria.id, label: categoria.nombre }))
      ]
    },
    { name: 'disponible', label: 'Disponible', type: 'checkbox', default: true }
  ];
}

async function nuevoProducto() {
  try {
    const categorias = await api('/api/menu/categorias');
    abrirFormulario({
      title: 'Nuevo plato',
      submitText: 'Crear plato',
      fields: camposProducto(categorias),
      values: categorias.length ? { categoria_id: categorias[0].id } : {},
      onSubmit: async (data) => {
        await api('/api/menu', { method: 'POST', body: data });
        toast('Plato creado');
        cargarMenu();
      }
    });
  } catch (err) {
    toast(err.message, 'danger');
  }
}

async function editarProducto(id) {
  const p = state.menu.find((x) => Number(x.id) === Number(id));
  if (!p) return;
  try {
    const categorias = await api('/api/menu/categorias');
    abrirFormulario({
      title: `Editar plato #${p.id}`,
      fields: camposProducto(categorias),
      values: p,
      onSubmit: async (data) => {
        await api(`/api/menu/${p.id}`, { method: 'PUT', body: data });
        toast('Plato actualizado');
        cargarMenu();
      }
    });
  } catch (err) {
    toast(err.message, 'danger');
  }
}

async function eliminarProducto(id) {
  if (!confirm('¿Eliminar este plato del menú?')) return;
  try {
    await api(`/api/menu/${id}`, { method: 'DELETE' });
    toast('Plato eliminado');
    cargarMenu();
  } catch (err) {
    // Si el plato ya está en pedidos, la BD no deja borrarlo
    toast(err.message, 'danger');
  }
}

// ------------------------------------------------------------
// ÓRDENES
// ------------------------------------------------------------
async function asegurarMenu() {
  if (!state.menu.length) {
    state.menu = await api('/api/menu');
  }
}

async function cargarOrdenes() {
  const [pedidos] = await Promise.all([api('/api/pedidos'), asegurarMenu()]);
  state.pedidos = pedidos;
  const p = can();

  const filas = pedidos
    .map((o) => {
      const estado = p.pedidoEstado
        ? `<select class="form-select form-select-sm" style="min-width:150px" onchange="cambiarEstado(${o.id}, this.value)">
             ${ESTADOS.map((e) => `<option value="${e}" ${e === o.estado ? 'selected' : ''}>${prettyEstado(e)}</option>`).join('')}
           </select>`
        : `<span class="badge text-bg-${ESTADO_BADGE[o.estado] || 'secondary'}">${esc(prettyEstado(o.estado))}</span>`;
      return `<tr>
        <td>${o.id}</td>
        <td>${esc(o.cliente)}</td>
        <td>${money(o.total)}</td>
        <td>${estado}</td>
        <td>${fmtDate(o.created_at)}</td>
        <td class="text-end text-nowrap">
          <button class="btn btn-sm btn-outline-secondary" onclick="verPedido(${o.id})">Ver detalle</button>
          ${p.pedidoEliminar ? `<button class="btn btn-sm btn-outline-danger" onclick="eliminarPedido(${o.id})">Eliminar</button>` : ''}
        </td>
      </tr>`;
    })
    .join('');

  $('data-ordenes').innerHTML = `
    <div class="d-flex gap-2 mb-3">
      <button class="btn btn-outline-secondary" onclick="loadData('ordenes')">Actualizar órdenes</button>
      ${p.pedidoCrear ? '<button class="btn btn-success" onclick="nuevoPedido()">+ Nueva orden</button>' : ''}
    </div>
    <div class="card"><div class="table-responsive">
      <table class="table table-hover align-middle mb-0">
        <thead><tr><th>ID</th><th>Cliente / Mesa</th><th>Total</th><th>Estado</th><th>Fecha</th><th></th></tr></thead>
        <tbody>${filas || '<tr><td colspan="6" class="text-center text-muted py-4">Todavía no hay órdenes.</td></tr>'}</tbody>
      </table>
    </div></div>`;
}

async function nuevoPedido() {
  await asegurarMenu();
  const productos = state.menu.filter((m) => Number(m.disponible));
  if (!productos.length) return toast('No hay platos disponibles para crear una orden.', 'warning');

  const filas = productos
    .map(
      (m) => `<tr>
        <td>${esc(m.nombre)}<div class="text-muted small">${money(m.precio)}</div></td>
        <td style="width:110px"><input type="number" min="0" value="0" class="form-control form-control-sm qty"
             data-id="${m.id}" data-precio="${Number(m.precio)}" aria-label="Cantidad de ${esc(m.nombre)}"></td>
      </tr>`
    )
    .join('');

  abrirFormulario({
    title: 'Nueva orden',
    submitText: 'Crear orden',
    html: `
      <div class="mb-3">
        <label class="form-label" for="f-cliente">Cliente o mesa</label>
        <input type="text" id="f-cliente" class="form-control" placeholder="Ej: Mesa 4" required>
      </div>
      <table class="table table-sm align-middle"><thead><tr><th>Plato</th><th>Cantidad</th></tr></thead><tbody>${filas}</tbody></table>
      <div class="text-end fw-bold">Total: <span id="orden-total">${money(0)}</span></div>`,
    collect: () => {
      const cliente = $('f-cliente').value.trim();
      const items = [...document.querySelectorAll('#form-modal-body .qty')]
        .filter((i) => Number(i.value) > 0)
        .map((i) => ({
          producto_id: Number(i.dataset.id),
          cantidad: Number(i.value),
          precio_unitario: Number(i.dataset.precio)
        }));
      if (!cliente) throw new Error('Escribe el cliente o la mesa.');
      if (!items.length) throw new Error('Agrega al menos un plato con cantidad mayor a 0.');
      return { cliente, items };
    },
    onSubmit: async (data) => {
      const r = await api('/api/pedidos', { method: 'POST', body: data });
      toast(`Orden #${r.pedido_id} creada · Total ${money(r.total)}`);
      cargarOrdenes();
    }
  });
}

async function verPedido(id) {
  try {
    const [o] = await Promise.all([api(`/api/pedidos/${id}`), asegurarMenu()]);
    const nombre = (pid) => {
      const m = state.menu.find((x) => Number(x.id) === Number(pid));
      return m ? m.nombre : `Producto #${pid}`;
    };
    const filas = (o.detalles || [])
      .map(
        (d) => `<tr><td>${esc(nombre(d.producto_id))}</td><td class="text-end">${d.cantidad}</td>
                <td class="text-end">${money(d.precio_unitario)}</td><td class="text-end">${money(d.subtotal)}</td></tr>`
      )
      .join('');
    abrirInfo(
      `Orden #${o.id}`,
      `<p class="mb-1"><strong>Cliente / Mesa:</strong> ${esc(o.cliente)}</p>
       <p class="mb-1"><strong>Estado:</strong> <span class="badge text-bg-${ESTADO_BADGE[o.estado] || 'secondary'}">${esc(prettyEstado(o.estado))}</span></p>
       <p class="mb-3"><strong>Fecha:</strong> ${fmtDate(o.created_at)}</p>
       <table class="table table-sm">
         <thead><tr><th>Plato</th><th class="text-end">Cant.</th><th class="text-end">Precio</th><th class="text-end">Subtotal</th></tr></thead>
         <tbody>${filas || '<tr><td colspan="4" class="text-muted">Sin detalle.</td></tr>'}</tbody>
       </table>
       <div class="text-end fw-bold">Total: ${money(o.total)}</div>`
    );
  } catch (err) {
    toast(err.message, 'danger');
  }
}

async function cambiarEstado(id, estado) {
  try {
    await api(`/api/pedidos/${id}/estado`, { method: 'PATCH', body: { estado } });
    toast(`Orden #${id}: ${prettyEstado(estado)}`);
  } catch (err) {
    toast(err.message, 'danger');
    cargarOrdenes();
  }
}

async function eliminarPedido(id) {
  if (!confirm('¿Eliminar esta orden? Esta acción no se puede deshacer.')) return;
  try {
    await api(`/api/pedidos/${id}`, { method: 'DELETE' });
    toast('Orden eliminada');
    cargarOrdenes();
  } catch (err) {
    toast(err.message, 'danger');
  }
}

// ============================================================
// ARRANQUE
// ============================================================
function init() {
  $('login-form').addEventListener('submit', onLogin);
  $('register-form').addEventListener('submit', onRegister);

  document.querySelectorAll('[data-auth-mode]').forEach((a) =>
    a.addEventListener('click', (e) => {
      e.preventDefault();
      setAuthMode(a.dataset.authMode);
    })
  );
  document.querySelectorAll('[data-tab]').forEach((a) =>
    a.addEventListener('click', (e) => {
      e.preventDefault();
      switchTab(a.dataset.tab);
    })
  );

  // Total en vivo del formulario de nueva orden
  $('form-modal-body').addEventListener('input', (e) => {
    if (!e.target.classList.contains('qty')) return;
    const total = [...document.querySelectorAll('#form-modal-body .qty')].reduce(
      (s, i) => s + Number(i.value || 0) * Number(i.dataset.precio),
      0
    );
    $('orden-total').textContent = money(total);
  });

  // Restaurar sesión si el token sigue vigente
  const token = localStorage.getItem('token');
  let user = null;
  try {
    user = JSON.parse(localStorage.getItem('usuario') || 'null');
  } catch {
    /* sesión corrupta */
  }
  if (token && user && !tokenExpirado(token)) {
    state.token = token;
    state.user = user;
    entrarAlDashboard();
  } else {
    limpiarSesion();
  }
}

window.addEventListener('error', (e) => toast('Error de JavaScript: ' + e.message, 'danger'));
document.addEventListener('DOMContentLoaded', init);