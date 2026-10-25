<%@ Language="VBScript" CodePage="65001" %>
<%
Option Explicit
Response.CharSet = "utf-8"
Response.CacheControl = "no-store"
%>
<!-- #include file="includes/auth.asp" -->
<!-- #include file="includes/conexion.asp" -->
<%
' ============================================================
' song_form.asp — Crear / Editar canción (solo admin)
' ============================================================
Dim idTxt, esEdicion, nombre, ruta, c, rs, fTipo, fMsg

RequerirAdmin   ' verificación de rol en el servidor

idTxt = Trim(Request.QueryString("id"))
esEdicion = (idTxt <> "")

If esEdicion And Not EsEntero(idTxt) Then
  Flash "error", "Identificador de canción inválido."
  Response.Redirect "songs.asp"
End If

nombre = ""
ruta = "~/SongFiles/bensound-adventure.mp3"

If esEdicion Then
  AbrirConexion
  Set c = NuevoCmd("SELECT SONG_NAME, SONG_PATH FROM TBL_SONG WHERE ID_SONG = ?")
  PInt c, "@id", idTxt
  Set rs = c.Execute
  If rs.EOF Then
    rs.Close
    CerrarConexion
    Flash "error", "La canción solicitada no existe."
    Response.Redirect "songs.asp"
  End If
  nombre = rs("SONG_NAME") & ""
  ruta   = rs("SONG_PATH") & ""
  rs.Close
  CerrarConexion
End If

' Si venimos de un error de validación, recuperar lo que escribió el admin
If Session("old_name") <> "" Or Session("old_path") <> "" Then
  nombre = Session("old_name")
  ruta   = Session("old_path")
  Session("old_name") = ""
  Session("old_path") = ""
End If

fTipo = Session("flash_tipo")
fMsg  = Session("flash_msg")
Session("flash_tipo") = ""
Session("flash_msg")  = ""
%>
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title><% If esEdicion Then %>Editar<% Else %>Nueva<% End If %> canción · PoliMusic</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Big+Shoulders+Display:wght@600;800&family=DM+Sans:wght@400;500;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="css/style.css">
  <script src="js/app.js" defer></script>
</head>
<body>
<header class="topbar">
  <a class="brand" href="songs.asp" aria-label="PoliMusic, inicio">
    <span class="brand-disc" aria-hidden="true"></span>
    <span class="brand-name">PoliMusic</span>
  </a>
  <a class="btn-ghost" href="songs.asp">Volver al listado</a>
</header>

<main class="wrap narrow">
  <% If fMsg <> "" Then %>
    <div class="flash flash-<%= Esc(fTipo) %>" role="alert"><%= Esc(fMsg) %></div>
  <% End If %>

  <h1><% If esEdicion Then %>Editar canción<% Else %>Nueva canción<% End If %></h1>

  <form id="song-form" class="card form-card" method="post" action="song_save.asp" novalidate>
    <input type="hidden" name="csrf" value="<%= Esc(Session("csrf")) %>">
    <input type="hidden" name="id" value="<%= Esc(idTxt) %>">

    <div class="field">
      <label for="song_name">Nombre de la canción</label>
      <input id="song_name" name="song_name" type="text" maxlength="50" required value="<%= Esc(nombre) %>" autocomplete="off">
      <span class="counter" id="cnt-name" aria-hidden="true"></span>
    </div>

    <div class="field">
      <label for="song_path">Ruta del archivo de audio</label>
      <input id="song_path" name="song_path" type="text" maxlength="255" required list="rutas" value="<%= Esc(ruta) %>" autocomplete="off">
      <datalist id="rutas"><option value="~/SongFiles/bensound-adventure.mp3"></option></datalist>
      <span class="counter" id="cnt-path" aria-hidden="true"></span>
      <small>Debe empezar con <code>~/</code> o <code>assets/</code> y terminar en .mp3, .wav, .ogg o .m4a.</small>
    </div>

    <div class="field">
      <button id="btn-preview" class="btn-ghost" type="button">Probar ruta</button>
      <span id="preview-msg" class="preview-msg" role="status"></span>
      <audio id="preview-audio" preload="none"></audio>
    </div>

    <div class="dlg-actions">
      <a class="btn-ghost" href="songs.asp">Cancelar</a>
      <button class="btn-primary" type="submit"><% If esEdicion Then %>Guardar cambios<% Else %>Crear canción<% End If %></button>
    </div>
  </form>
</main>
</body>
</html>
