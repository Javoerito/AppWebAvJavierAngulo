<%@ Language="VBScript" CodePage="65001" %>
<%
' =====================================================================
' songs.asp - Página principal: bienvenida, Song List, tabla y reproductor
' =====================================================================
Response.Charset = "utf-8"
%>
<!--#include file="includes/conexion.asp" -->
<!--#include file="includes/auth.asp" -->
<%
Dim cn, cmd, rs, n, cover, srcAudio, totalCols
Set cn = AbrirConexion()
Set cmd = NuevoCmd(cn, "SELECT ID_SONG, SONG_NAME, SONG_PATH, ISNULL(PLAYS,0) AS PLAYS FROM TBL_SONG ORDER BY ID_SONG")
Set rs = cmd.Execute
totalCols = 5
If g_esAdmin Then totalCols = 6
%>
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Song List · PoliMusic</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=Sora:wght@600;700;800&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="css/style.css">
</head>
<body data-csrf="<%= Hx(Session("csrf")) %>">
  <!--#include file="includes/header.asp" -->

  <main class="container">
    <section class="hero">
      <p class="eyebrow">Tu biblioteca</p>
      <h1>Bienvenido, <span class="grad"><%= Hx(g_usuario) %></span></h1>
      <h2 class="section-title">Song List</h2>
      <p class="muted">Este es el listado de canciones de PoliMusic. Elige una y dale play.</p>
    </section>

    <%= HtmlFlash() %>

    <div class="toolbar">
      <span class="muted" id="contador-canciones"></span>
      <% If g_esAdmin Then %>
        <a class="btn btn-primary" href="song_form.asp" aria-label="Crear nueva canción">+ Nueva canción</a>
      <% End If %>
    </div>

    <section class="card" aria-label="Listado de canciones">
      <table class="table" id="tabla-canciones">
        <thead>
          <tr>
            <th scope="col">#</th>
            <th scope="col">Portada</th>
            <th scope="col">Canción</th>
            <th scope="col">Reproducciones</th>
            <th scope="col">Reproducir</th>
            <% If g_esAdmin Then %><th scope="col">Acciones</th><% End If %>
          </tr>
        </thead>
        <tbody>
<%
n = 0
Do While Not rs.EOF
    n = n + 1
    cover = "assets/PlaylistImages/playlist" & (((n - 1) Mod 5) + 1) & ".png"
    srcAudio = ConvertirRuta(rs("SONG_PATH"))
%>
          <tr data-id="<%= CLng(rs("ID_SONG")) %>" data-name="<%= Hx(rs("SONG_NAME")) %>" data-src="<%= Hx(srcAudio) %>" data-cover="<%= Hx(cover) %>">
            <td data-label="#"><%= n %></td>
            <td data-label="Portada"><img class="cover" src="<%= Hx(cover) %>" alt="Portada de <%= Hx(rs("SONG_NAME")) %>" width="48" height="48" loading="lazy"></td>
            <td data-label="Canción"><span class="song-name"><%= Hx(rs("SONG_NAME")) %></span><span class="eq" aria-hidden="true"><i></i><i></i><i></i></span></td>
            <td data-label="Reproducciones"><span class="plays" id="plays-<%= CLng(rs("ID_SONG")) %>"><%= CLng(rs("PLAYS")) %></span></td>
            <td data-label="Reproducir"><button type="button" class="btn-play" aria-label="Reproducir <%= Hx(rs("SONG_NAME")) %>">&#9654;</button></td>
            <% If g_esAdmin Then %>
            <td data-label="Acciones" class="acciones">
              <a class="btn btn-sm btn-ghost" href="song_form.asp?id=<%= CLng(rs("ID_SONG")) %>" aria-label="Editar <%= Hx(rs("SONG_NAME")) %>">Editar</a>
              <button type="button" class="btn btn-sm btn-danger btn-delete" data-id="<%= CLng(rs("ID_SONG")) %>" data-name="<%= Hx(rs("SONG_NAME")) %>" aria-label="Eliminar <%= Hx(rs("SONG_NAME")) %>">Eliminar</button>
            </td>
            <% End If %>
          </tr>
<%
    rs.MoveNext
Loop
rs.Close
Set rs = Nothing
CerrarConexion cn

If n = 0 Then
%>
          <tr class="empty"><td colspan="<%= totalCols %>">Aún no hay canciones registradas.</td></tr>
<%
End If
%>
        </tbody>
      </table>
    </section>
  </main>

  <!-- Reproductor personalizado -->
  <footer class="player" id="player" aria-label="Reproductor de música">
    <audio id="audio" preload="none"></audio>
    <div class="player-info">
      <img id="pl-cover" src="assets/PlaylistImages/default.jpg" alt="Portada de la canción actual" width="56" height="56">
      <div>
        <p class="pl-label">Sonando ahora</p>
        <p class="pl-title" id="pl-title">Elige una canción</p>
      </div>
    </div>
    <div class="player-main">
      <button type="button" id="pl-toggle" class="btn-play btn-play-lg" aria-label="Reproducir" disabled>&#9654;</button>
      <span class="time" id="pl-cur">0:00</span>
      <input type="range" id="pl-seek" min="0" max="1000" value="0" step="1" aria-label="Progreso de la canción" disabled>
      <span class="time" id="pl-dur">0:00</span>
    </div>
    <div class="player-vol">
      <button type="button" id="pl-mute" class="btn-icon" aria-label="Silenciar">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M3 10v4h4l5 4V6L7 10H3zm13.5 2a4.5 4.5 0 0 0-2.5-4.03v8.05A4.5 4.5 0 0 0 16.5 12z"/></svg>
      </button>
      <input type="range" id="pl-vol" min="0" max="1" value="0.8" step="0.01" aria-label="Volumen">
    </div>
  </footer>

<% If g_esAdmin Then %>
  <!-- Modal de confirmación para eliminar (solo admin) -->
  <dialog id="dlg-delete" class="dialog" aria-labelledby="dlg-title">
    <form method="post" action="song_delete.asp">
      <input type="hidden" name="csrf" value="<%= Hx(Session("csrf")) %>">
      <input type="hidden" name="id" id="dlg-id" value="">
      <h3 id="dlg-title">Eliminar canción</h3>
      <p>¿Seguro que quieres eliminar <strong id="dlg-name"></strong>? También se quitará de álbumes, intérpretes y playlists. No se puede deshacer.</p>
      <div class="dialog-actions">
        <button type="button" class="btn btn-ghost" data-close>Cancelar</button>
        <button type="submit" class="btn btn-danger">Sí, eliminar</button>
      </div>
    </form>
  </dialog>
<% End If %>

  <div id="toasts" class="toasts" aria-live="polite"></div>
  <script src="js/app.js"></script>
</body>
</html>
