<%
' ============================================================
' includes/auth.asp
' Sesión, roles, CSRF y utilidades compartidas por TODAS las páginas.
' login.asp guarda: Session("username") y Session("usertype").
' Aquí SOLO se leen; nunca se hace el login.
' ============================================================

' ¿Hay sesión activa?
Function SesionActiva()
  SesionActiva = (Trim(CStr(Session("username") & "")) <> "")
End Function

' ¿Es administrador? (acepta 1, True o -1 según el tipo de columna: INT o BIT)
Function EsAdmin()
  Dim t
  t = LCase(Trim(CStr(Session("usertype") & "")))
  EsAdmin = (t = "1" Or t = "true" Or t = "-1")
End Function

' Sin sesión -> login.asp
Sub RequerirSesion()
  If Not SesionActiva() Then Response.Redirect "login.asp"
End Sub

' Mensaje "flash": se muestra una sola vez en la siguiente página
Sub Flash(tipo, mensaje)
  Session("flash_tipo") = tipo      ' "ok" o "error"
  Session("flash_msg")  = mensaje
End Sub

' Verificación EN EL SERVIDOR del rol admin (no basta con ocultar botones)
Sub RequerirAdmin()
  RequerirSesion
  If Not EsAdmin() Then
    Flash "error", "Acceso denegado: esta acción es solo para administradores."
    Response.Redirect "songs.asp"
  End If
End Sub

' Salida segura
Function Esc(s)
  Esc = Server.HTMLEncode(CStr(s & ""))
End Function

' "~/SongFiles/x.mp3" (formato de la BD) -> "assets/SongFiles/x.mp3" (ruta del sitio)
Function ResolverRuta(p)
  Dim r
  r = Trim(CStr(p & ""))
  If Left(r, 2) = "~/" Then r = "assets/" & Mid(r, 3)
  ResolverRuta = r
End Function

' ¿El archivo existe físicamente en el sitio?
Function ArchivoExiste(rutaWeb)
  Dim fso
  ArchivoExiste = False
  If rutaWeb = "" Then Exit Function
  On Error Resume Next
  Set fso = Server.CreateObject("Scripting.FileSystemObject")
  ArchivoExiste = fso.FileExists(Server.MapPath(rutaWeb))
  If Err.Number <> 0 Then ArchivoExiste = False
  On Error GoTo 0
  Set fso = Nothing
End Function

' Entero positivo de hasta 9 dígitos
Function EsEntero(s)
  Dim re
  Set re = New RegExp
  re.Pattern = "^[0-9]{1,9}$"
  EsEntero = re.Test(CStr(s & ""))
End Function

' Ruta de canción permitida: empieza con ~/ o assets/, solo caracteres seguros,
' extensión de audio y sin ".." (evita path traversal y esquemas tipo javascript:)
Function RutaCancionValida(p)
  Dim re
  Set re = New RegExp
  re.Pattern = "^(~/|assets/)[A-Za-z0-9_\-\. /]+\.(mp3|wav|ogg|m4a)$"
  re.IgnoreCase = True
  RutaCancionValida = (re.Test(p) And InStr(p, "..") = 0)
End Function

' ---------- CSRF ----------
Function GenerarToken()
  Dim i, s, chars
  chars = "abcdefghijklmnopqrstuvwxyz0123456789"
  Randomize
  s = ""
  For i = 1 To 32
    s = s & Mid(chars, Int(Rnd * Len(chars)) + 1, 1)
  Next
  GenerarToken = s
End Function

Function TokenValido(t)
  TokenValido = (CStr(t & "") <> "" And CStr(t & "") = CStr(Session("csrf") & ""))
End Function

If CStr(Session("csrf") & "") = "" Then Session("csrf") = GenerarToken()
%>
