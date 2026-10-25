<%@ Language="VBScript" CodePage="65001" %>
<%
' =====================================================================
' login.asp - Inicio de sesión de PoliMusic
' Guarda en sesión: username, usertype (0 normal / 1 admin), userphoto, userid
' =====================================================================
Response.Charset = "utf-8"
Response.CacheControl = "no-cache"
Response.AddHeader "Pragma", "no-cache"
Response.Expires = -1
%>
<!--#include file="includes/conexion.asp" -->
<%
Dim cn, cmd, rs, usuarioIn, claveIn, errorMsg, infoMsg
errorMsg = "" : infoMsg = "" : usuarioIn = ""

' Si ya hay sesión, directo a la lista
If Trim(Session("username") & "") <> "" Then Response.Redirect "songs.asp"

Select Case Request.QueryString("msg")
    Case "sesion": infoMsg = "Inicia sesión para continuar."
    Case "bye":    infoMsg = "Cerraste sesión correctamente."
End Select

If Request.ServerVariables("REQUEST_METHOD") = "POST" Then
    usuarioIn = Trim(Request.Form("username"))
    claveIn = Request.Form("password")

    If usuarioIn = "" Or claveIn = "" Then
        errorMsg = "Ingresa tu usuario y contraseña."
    ElseIf Len(usuarioIn) > 50 Or Len(claveIn) > 50 Then
        errorMsg = "Usuario o contraseña demasiado largos."
    Else
        Set cn = AbrirConexion()
        ' Consulta parametrizada. La contraseña se compara respetando mayúsculas.
        Set cmd = NuevoCmd(cn, "SELECT ID_USER, USERNAME, USER_PHOTO, USER_TYPE FROM TBL_USER " & _
                               "WHERE USERNAME = ? AND PASSWORD COLLATE Latin1_General_CS_AS = ?")
        ParamTexto cmd, "u", usuarioIn, 50
        ParamTexto cmd, "p", claveIn, 50
        Set rs = cmd.Execute
        If rs.EOF Then
            errorMsg = "Usuario o contraseña incorrectos."
        Else
            Session.Contents.RemoveAll
            Session("userid")    = CLng(rs("ID_USER"))
            Session("username")  = CStr(rs("USERNAME"))
            Session("usertype")  = CLng(rs("USER_TYPE"))
            Session("userphoto") = rs("USER_PHOTO") & ""
        End If
        rs.Close
        Set rs = Nothing
        CerrarConexion cn
        If errorMsg = "" Then Response.Redirect "songs.asp"
    End If
End If
%>
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Iniciar sesión · PoliMusic</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=Sora:wght@600;700;800&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="css/style.css">
</head>
<body class="auth-body">
  <main class="auth-card" aria-labelledby="login-title">
    <div class="brand brand-lg"><span class="brand-mark" aria-hidden="true">&#9835;</span>PoliMusic</div>
    <h1 id="login-title">Iniciar sesión</h1>
    <p class="muted">Entra para escuchar tu lista de canciones.</p>

    <% If infoMsg <> "" Then %><div class="flash flash-ok" role="status"><span><%= Hx(infoMsg) %></span></div><% End If %>
    <% If errorMsg <> "" Then %><div class="flash flash-error" role="alert"><span><%= Hx(errorMsg) %></span></div><% End If %>

    <form method="post" action="login.asp" class="form" autocomplete="on">
      <label for="username">Usuario</label>
      <input type="text" id="username" name="username" maxlength="50" required autofocus
             autocomplete="username" value="<%= Hx(usuarioIn) %>">

      <label for="password">Contraseña</label>
      <input type="password" id="password" name="password" maxlength="50" required autocomplete="current-password">

      <button type="submit" class="btn btn-primary btn-block">Entrar</button>
    </form>
  </main>
  <script src="js/app.js"></script>
</body>
</html>
