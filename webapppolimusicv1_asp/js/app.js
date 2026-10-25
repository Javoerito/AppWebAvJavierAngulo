/* =====================================================================
   js/app.js - Reproductor, conteo de reproducciones (fetch), modal de
   borrado y mensajes. Se carga en todas las páginas; cada módulo se
   activa solo si existen sus elementos.
   ===================================================================== */
(function () {
  'use strict';

  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }

  /* ---------- Avisos tipo "toast" ---------- */
  function aviso(texto, tipo) {
    var cont = $('#toasts');
    if (!cont) { return; }
    var t = document.createElement('div');
    t.className = 'toast ' + (tipo || '');
    t.textContent = texto;
    cont.appendChild(t);
    setTimeout(function () { if (t.parentNode) { t.parentNode.removeChild(t); } }, 4500);
  }

  /* ---------- Mensajes flash: cerrar y auto-ocultar ---------- */
  function initFlash() {
    $$('.flash').forEach(function (f) {
      var cerrar = $('.flash-close', f);
      if (cerrar) { cerrar.addEventListener('click', function () { f.remove(); }); }
      if (f.classList.contains('flash-ok') && cerrar) { setTimeout(function () { f.remove(); }, 6000); }
    });
  }

  /* ---------- Reproductor ---------- */
  function initPlayer() {
    var audio = $('#audio');
    if (!audio) { return; }

    var tabla = $('#tabla-canciones');
    var player = $('#player');
    var btnToggle = $('#pl-toggle');
    var seek = $('#pl-seek');
    var cur = $('#pl-cur');
    var dur = $('#pl-dur');
    var vol = $('#pl-vol');
    var mute = $('#pl-mute');
    var title = $('#pl-title');
    var cover = $('#pl-cover');
    var csrf = document.body.getAttribute('data-csrf') || '';
    var filaActual = null;
    var contada = false;       // ¿ya sumamos la reproducción de esta carga?

    // Contador de canciones
    var total = $$('tbody tr[data-id]', tabla).length;
    var contador = $('#contador-canciones');
    if (contador) { contador.textContent = total + (total === 1 ? ' canción' : ' canciones'); }

    function fmt(t) {
      if (!isFinite(t)) { return '0:00'; }
      var m = Math.floor(t / 60), s = Math.floor(t % 60);
      return m + ':' + (s < 10 ? '0' : '') + s;
    }
    function pintar(input, pct) { input.style.setProperty('--p', pct + '%'); }

    /* Marca visualmente la fila (botón ▶ / ❚❚ y clases) */
    function estadoFila(fila, sonando) {
      if (!fila) { return; }
      var b = $('.btn-play', fila);
      fila.classList.toggle('is-playing', sonando);
      if (b) {
        b.innerHTML = sonando ? '&#10074;&#10074;' : '&#9654;';
        b.setAttribute('aria-label', (sonando ? 'Pausar ' : 'Reproducir ') + fila.getAttribute('data-name'));
      }
      btnToggle.innerHTML = sonando ? '&#10074;&#10074;' : '&#9654;';
      btnToggle.setAttribute('aria-label', sonando ? 'Pausar' : 'Reproducir');
    }

    function cargar(fila) {
      if (filaActual) { filaActual.classList.remove('is-current', 'is-playing'); estadoFila(filaActual, false); }
      filaActual = fila;
      contada = false;
      audio.src = fila.getAttribute('data-src');
      audio.load();
      fila.classList.add('is-current');
      title.textContent = fila.getAttribute('data-name');
      cover.src = fila.getAttribute('data-cover');
      cover.alt = 'Portada de ' + fila.getAttribute('data-name');
      player.style.setProperty('--cover', 'url("' + fila.getAttribute('data-cover') + '")');
      btnToggle.disabled = false;
      seek.disabled = false;
      seek.value = 0; pintar(seek, 0); cur.textContent = '0:00'; dur.textContent = '0:00';
    }

    function reproducir() {
      var p = audio.play();
      if (p && p.catch) {
        p.catch(function () { aviso('No se pudo reproducir el audio. Revisa la ruta del archivo.', 'error'); });
      }
    }

    function alternar() {
      if (!filaActual) { return; }
      if (audio.paused) {
        if (audio.ended) { audio.currentTime = 0; contada = false; }
        reproducir();
      } else {
        audio.pause();
      }
    }

    /* Botón ▶ de cada fila */
    tabla.addEventListener('click', function (e) {
      var b = e.target.closest('.btn-play');
      if (!b) { return; }
      var fila = b.closest('tr');
      if (fila === filaActual) { alternar(); } else { cargar(fila); reproducir(); }
    });
    btnToggle.addEventListener('click', alternar);

    /* Eventos del <audio> */
    audio.addEventListener('playing', function () {
      estadoFila(filaActual, true);
      if (!contada && filaActual) {          // solo cuenta cuando REALMENTE empieza a sonar
        contada = true;
        contarReproduccion(filaActual.getAttribute('data-id'));
      }
    });
    audio.addEventListener('pause', function () { estadoFila(filaActual, false); });
    audio.addEventListener('ended', function () { contada = false; estadoFila(filaActual, false); });
    audio.addEventListener('loadedmetadata', function () { dur.textContent = fmt(audio.duration); });
    audio.addEventListener('timeupdate', function () {
      cur.textContent = fmt(audio.currentTime);
      if (audio.duration) {
        var pct = (audio.currentTime / audio.duration) * 100;
        seek.value = pct * 10; pintar(seek, pct);
      }
    });
    audio.addEventListener('error', function () {
      if (filaActual) { aviso('No se encontró el archivo de audio de "' + filaActual.getAttribute('data-name') + '".', 'error'); }
      estadoFila(filaActual, false);
    });

    /* Barra de progreso */
    seek.addEventListener('input', function () {
      pintar(seek, seek.value / 10);
      if (isFinite(audio.duration)) { audio.currentTime = (seek.value / 1000) * audio.duration; }
    });

    /* Volumen */
    var guardado = null;
    try { guardado = window.localStorage.getItem('polimusic_vol'); } catch (err) { guardado = null; }
    if (guardado !== null && !isNaN(parseFloat(guardado))) { vol.value = guardado; }
    audio.volume = parseFloat(vol.value);
    pintar(vol, vol.value * 100);
    vol.addEventListener('input', function () {
      audio.volume = parseFloat(vol.value);
      audio.muted = false;
      pintar(vol, vol.value * 100);
      try { window.localStorage.setItem('polimusic_vol', vol.value); } catch (err) { /* sin almacenamiento */ }
    });
    mute.addEventListener('click', function () {
      audio.muted = !audio.muted;
      mute.setAttribute('aria-label', audio.muted ? 'Quitar silencio' : 'Silenciar');
      mute.style.opacity = audio.muted ? '.5' : '1';
    });

    /* Suma 1 en la BD vía fetch y actualiza la tabla sin recargar */
    function contarReproduccion(id) {
      fetch('song_play.asp', {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'X-Requested-With': 'XMLHttpRequest',
          'X-CSRF-Token': csrf
        },
        body: 'id=' + encodeURIComponent(id)
      }).then(function (r) {
        if (r.status === 401) { window.location.href = 'login.asp?msg=sesion'; throw new Error('sesion'); }
        return r.json();
      }).then(function (d) {
        if (d && d.ok) {
          var el = document.getElementById('plays-' + id);
          if (el) {
            el.textContent = d.plays;
            el.classList.add('bump');
            setTimeout(function () { el.classList.remove('bump'); }, 400);
          }
        }
      }).catch(function () { /* si falla el conteo, no interrumpimos la música */ });
    }
  }

  /* ---------- Modal de confirmación de borrado (admin) ---------- */
  function initDelete() {
    var dlg = $('#dlg-delete');
    if (!dlg) { return; }
    document.addEventListener('click', function (e) {
      var b = e.target.closest('.btn-delete');
      if (b) {
        var nombre = b.getAttribute('data-name');
        $('#dlg-id').value = b.getAttribute('data-id');
        $('#dlg-name').textContent = nombre;
        if (typeof dlg.showModal === 'function') {
          dlg.showModal();
        } else if (window.confirm('¿Eliminar "' + nombre + '"? Esta acción no se puede deshacer.')) {
          $('form', dlg).submit();
        }
        return;
      }
      if (e.target.closest('[data-close]')) { dlg.close(); }
    });
    dlg.addEventListener('click', function (e) { if (e.target === dlg) { dlg.close(); } });
  }

  document.addEventListener('DOMContentLoaded', function () {
    initFlash();
    initPlayer();
    initDelete();
  });
})();
