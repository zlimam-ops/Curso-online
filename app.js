"use strict";

/* ===== Base de datos (IndexedDB) ===== */
let db;
const peticion = indexedDB.open("AuroraDB", 1);
peticion.onupgradeneeded = e => {
  const d = e.target.result;
  d.createObjectStore("estudiantes", { keyPath: "id", autoIncrement: true });
  d.createObjectStore("evaluaciones", { keyPath: "id", autoIncrement: true });
};
peticion.onsuccess = e => { db = e.target.result; };
peticion.onerror = () => alert("No se pudo abrir la base de datos del navegador.");

function guardar(almacen, objeto) {
  return new Promise((ok, fallo) => {
    const tx = db.transaction(almacen, "readwrite");
    const rq = tx.objectStore(almacen).add(objeto);
    rq.onsuccess = () => ok(rq.result);
    rq.onerror = () => fallo(rq.error);
  });
}

/* ===== Navegación entre pantallas ===== */
let estudiante = null;
function mostrar(id) {
  document.querySelectorAll(".pantalla").forEach(p => p.classList.remove("activa"));
  document.getElementById(id).classList.add("activa");
  window.scrollTo(0, 0);
}

/* ===== 1. Registro ===== */
document.getElementById("formRegistro").addEventListener("submit", async ev => {
  ev.preventDefault();
  const f = new FormData(ev.target);
  estudiante = Object.fromEntries(f.entries());
  estudiante.fecha = new Date().toLocaleString("es-GT");
  try {
    estudiante.id = await guardar("estudiantes", estudiante);
  } catch (e) { alert("Error al guardar el registro."); return; }

  const etiquetas = { id: "Matrícula", nombre: "Nombres", apellido: "Apellidos", correo: "Correo",
    edad: "Edad", pais: "País", curso: "Curso", fecha: "Fecha de inscripción" };
  document.getElementById("listaDatos").innerHTML = Object.keys(etiquetas)
    .map(k => `<dt>${etiquetas[k]}</dt><dd>${escapar(estudiante[k])}</dd>`).join("");
  mostrar("datos");
});

function escapar(t) {
  const d = document.createElement("div");
  d.textContent = t;
  return d.innerHTML;
}

document.getElementById("btnCurso").onclick = () => mostrar("curso");
document.getElementById("btnEval").onclick = () => mostrar("evaluacion");

/* ===== 2. Evaluación ===== */
const PUNTOS = 12.5;
const igualConjunto = (a, b) => a.length === b.length && b.every(x => a.includes(x));

document.getElementById("formEval").addEventListener("submit", async ev => {
  ev.preventDefault();
  const f = ev.target;
  const radio = n => (f.querySelector(`input[name="${n}"]:checked`) || {}).value || "";
  const checks = n => [...f.querySelectorAll(`input[name="${n}"]:checked`)].map(c => c.value);
  const multi = n => [...f[n].selectedOptions].map(o => o.value);

  const respuestas = {
    p1: radio("p1"),
    p2: checks("p2"),
    p3: f.p3.value,
    p4: multi("p4"),
    p5: f.p5.value.trim().toLowerCase(),
    p6: radio("p6"),
    p7: f.p7.value,
    p8: f.p8.value
  };

  let aciertos = 0;
  if (respuestas.p1 === "a") aciertos++;
  if (igualConjunto(respuestas.p2, ["a", "img", "p"])) aciertos++;
  if (respuestas.p3 === "b") aciertos++;
  if (igualConjunto(respuestas.p4, ["string", "number", "boolean"])) aciertos++;
  if (respuestas.p5 === "href") aciertos++;
  if (respuestas.p6 === "f") aciertos++;
  if (respuestas.p7 === "6") aciertos++;
  if (respuestas.p8 === "a") aciertos++;

  const nota = aciertos * PUNTOS;
  const aprobado = nota >= 70;
  const folio = "AUR-" + new Date().getFullYear() + "-" + String(estudiante.id).padStart(4, "0");

  try {
    await guardar("evaluaciones", {
      estudianteId: estudiante.id, correo: estudiante.correo, respuestas,
      aciertos, nota, aprobado, folio, fecha: new Date().toISOString()
    });
  } catch (e) { alert("Error al guardar la evaluación."); return; }

  const elNota = document.getElementById("nota");
  elNota.textContent = nota.toFixed(1) + " / 100";
  elNota.className = "nota " + (aprobado ? "ok" : "mal");
  document.getElementById("mensaje").textContent = aprobado
    ? `¡Felicidades, ${estudiante.nombre}! Acertaste ${aciertos} de 8 preguntas y aprobaste el curso.`
    : `Acertaste ${aciertos} de 8 preguntas. Necesitas 70 para aprobar; repasa el curso e inténtalo de nuevo.`;

  const diploma = document.getElementById("diploma");
  diploma.hidden = !aprobado;
  document.getElementById("btnImprimir").hidden = !aprobado;
  if (aprobado) {
    document.getElementById("dipNombre").textContent = estudiante.nombre + " " + estudiante.apellido;
    document.getElementById("dipNota").textContent = nota.toFixed(1);
    document.getElementById("dipFecha").textContent = "Expedido el " + new Date().toLocaleDateString("es-GT", { dateStyle: "long" });
    document.getElementById("dipFolio").textContent = "Folio " + folio;
  }
  mostrar("resultado");
});

document.getElementById("btnImprimir").onclick = () => window.print();
document.getElementById("btnReiniciar").onclick = () => {
  document.getElementById("formEval").reset();
  document.getElementById("formRegistro").reset();
  estudiante = null;
  mostrar("inicio");
};