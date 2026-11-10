"use strict";

// ─── Estado central de la aplicación ─────────────────────────────────────
let tareas = [];
let filtroEstado = "todas";
let filtroPrioridad = "todas";

// Secuencia de estados posibles, en el orden en que una tarea avanza
const SECUENCIA_ESTADOS = ["pendiente", "en-progreso", "completada"];

// Referencia al contenedor del tablero
const tablero = document.querySelector("#tablero");

// Obtiene el valor de un campo de texto sin espacios sobrantes
const leerCampo = (selector) => document.querySelector(selector).value.trim();

// Vacía los campos de texto del formulario (solo se llama cuando la tarea es válida)
const limpiarFormulario = () => {
  document.querySelector("#input-titulo").value = "";
  document.querySelector("#input-descripcion").value = "";
};

// Evita que el texto escrito por el usuario se interprete como HTML (innerHTML)
const escaparHTML = (texto) =>
  texto
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

// ─── Decisión de diseño 1: generador de ID (Estrategia A: closure) ───────
// El contador vive dentro del closure: ninguna otra parte del archivo puede
// leerlo ni reasignarlo, solo se puede avanzar llamando a generarId().
function crearGeneradorId() {
  let contador = 1; // variable privada, solo visible dentro del closure
  return () => contador++;
}
const generarId = crearGeneradorId();

// ─── Prioridad con switch ────────────────────────────────────────────────
// Checkpoint de comprensión: uso switch (y no if/else-if) porque cada rama
// compara la misma variable, prioridad, contra un valor fijo y conocido.
// No hay rangos ni condiciones combinadas, así que switch se lee más claro.
function obtenerConfigPrioridad(prioridad) {
  switch (prioridad) {
    case "alta":
      return { clase: "prioridad-alta", etiqueta: "Alta" };
    case "media":
      return { clase: "prioridad-media", etiqueta: "Media" };
    case "baja":
      return { clase: "prioridad-baja", etiqueta: "Baja" };
    default:
      return { clase: "prioridad-media", etiqueta: "Media" };
  }
}

// ─── Creación de la tarjeta en el DOM ────────────────────────────────────
function crearElementoTarea({ id, titulo, descripcion, prioridad, estado }) {
  const { clase: clasePrioridad, etiqueta: etiquetaPrioridad } = obtenerConfigPrioridad(prioridad);

  const tarea = document.createElement("article");
  tarea.classList.add("tarea", `estado-${estado}`, clasePrioridad);
  tarea.dataset.id = id;

  const puedeAvanzar = estado !== "completada";

  tarea.innerHTML = `
    <span class="badge-prioridad">${etiquetaPrioridad}</span>
    <span class="badge-estado">${estado}</span>
    <h3>${escaparHTML(titulo)}</h3>
    <p>${escaparHTML(descripcion)}</p>
    <div class="acciones-tarea">
      ${puedeAvanzar
        ? `<button class="btn-avanzar" data-id="${id}" data-action="avanzar">Avanzar estado</button>`
        : ""}
      <button class="btn-eliminar" data-id="${id}" data-action="eliminar">Eliminar</button>
    </div>
  `;

  return tarea;
}

// ─── Estadísticas con reduce() y for...of ────────────────────────────────
function actualizarStats() {
  // reduce: construye un objeto { estado: cantidad } a partir del array de tareas
  const conteos = tareas.reduce((acumulador, tarea) => {
    acumulador[tarea.estado] = (acumulador[tarea.estado] || 0) + 1;
    return acumulador;
  }, {});

  // for...of: recorre SECUENCIA_ESTADOS para mantener siempre el mismo orden
  const partes = [];
  for (const estado of SECUENCIA_ESTADOS) {
    const cantidad = conteos[estado] || 0;
    partes.push(`${cantidad} ${estado}`);
  }

  document.querySelector("#stats").textContent =
    `Tareas: ${partes.join(" · ")} (total ${tareas.length})`;
}

// ─── Decisión de diseño 2: actualización del DOM (Estrategia B) ──────────
// Reconstrucción completa: el array `tareas` + los filtros activos son la
// única fuente de verdad. Agregar, avanzar, eliminar y filtrar pasan todos
// por esta misma función.
function renderizarTablero() {
  tablero.innerHTML = "";

  const visibles = tareas
    .filter(t => filtroEstado === "todas" || t.estado === filtroEstado)
    .filter(t => filtroPrioridad === "todas" || t.prioridad === filtroPrioridad);

  if (visibles.length === 0) {
    const vacio = document.createElement("p");
    vacio.classList.add("tablero-vacio");
    vacio.textContent = "No hay tareas para mostrar.";
    tablero.appendChild(vacio);
    return;
  }

  visibles.forEach(t => tablero.appendChild(crearElementoTarea(t)));
}

// ─── Agregar tareas ──────────────────────────────────────────────────────
function agregarTarea() {
  const titulo      = leerCampo("#input-titulo");
  const descripcion = leerCampo("#input-descripcion");
  const prioridad   = document.querySelector("#select-prioridad").value;

  // Validación básica: título y descripción son obligatorios
  if (!titulo || !descripcion) {
    alert("El título y la descripción son obligatorios.");
    return;
  }

  // Crear objeto tarea y agregarlo al estado
  const nuevaTarea = { id: generarId(), titulo, descripcion, prioridad, estado: "pendiente" };
  tareas.push(nuevaTarea);

  limpiarFormulario();
  renderizarTablero(); // misma función de renderizado que el resto de acciones
  actualizarStats();
}

document.querySelector("#btn-agregar").addEventListener("click", agregarTarea);

// ─── Delegación de eventos: un solo listener para avanzar y eliminar ─────
tablero.addEventListener("click", (e) => {
  const boton = e.target.closest("button[data-action]");
  if (!boton) return;

  const id = Number(boton.dataset.id);

  if (boton.dataset.action === "eliminar") {
    tareas = tareas.filter(t => t.id !== id);
    renderizarTablero();
    actualizarStats();
    return;
  }

  if (boton.dataset.action === "avanzar") {
    const tarea = tareas.find(t => t.id === id);
    if (!tarea) return;

    const indiceActual = SECUENCIA_ESTADOS.indexOf(tarea.estado);
    // Solo avanza si existe un estado siguiente en la secuencia
    if (indiceActual < SECUENCIA_ESTADOS.length - 1) {
      tarea.estado = SECUENCIA_ESTADOS[indiceActual + 1];
    }

    renderizarTablero();
    actualizarStats();
  }
});

// ─── Filtrado combinado por estado y prioridad ───────────────────────────
const btnsFiltroEstado = document.querySelectorAll(".btn-filtro-estado");

btnsFiltroEstado.forEach(btn => {
  btn.addEventListener("click", () => {
    btnsFiltroEstado.forEach(b => b.classList.remove("activo"));
    btn.classList.add("activo");
    filtroEstado = btn.dataset.estado;
    renderizarTablero(); // con la Estrategia B, renderizarTablero aplica ambos filtros
  });
});

document.querySelector("#select-filtro-prioridad").addEventListener("change", (e) => {
  filtroPrioridad = e.target.value;
  renderizarTablero();
});

// ─── Estado inicial ──────────────────────────────────────────────────────
renderizarTablero();
actualizarStats();
