<%
' =====================================================================
' includes/header.asp  -  Encabezado común (logo, foto, usuario, rol, logout)
' Requiere conexion.asp y auth.asp ya incluidos.
' =====================================================================
Dim h_foto, h_rol, h_claseRol
h_foto = RutaImagen(Session("userphoto"), "assets/UserImages/default.jpg")
If g_esAdmin Then
    h_rol = "Admin" : h_claseRol = "badge-admin"
Else
    h_rol = "Normal" : h_claseRol = "badge-normal"
End If
%>
<header class="topbar">
  <a class="brand" href="songs.asp" aria-label="PoliMusic, ir al inicio">
    <span class="brand-mark" aria-hidden="true">&#9835;</span>PoliMusic
  </a>
  <div class="userbox">
    <img class="avatar" src="<%= Hx(h_foto) %>" alt="Foto de perfil de <%= Hx(g_usuario) %>" width="40" height="40">
    <span class="uname"><%= Hx(g_usuario) %></span>
    <span class="badge <%= h_claseRol %>">Rol: <%= h_rol %></span>
    <a class="btn btn-ghost" href="logout.asp" aria-label="Cerrar sesión">Cerrar sesión</a>
  </div>
</header>
