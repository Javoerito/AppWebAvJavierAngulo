<%
' =====================================================================
' includes/auth.asp
' Validación de sesión y rol. SOLO LEE Session("username") y
' Session("usertype") (los guarda login.asp).
' Incluir DESPUÉS de conexion.asp en toda página protegida.
' =====================================================================
Response.Buffer = True
Response.CacheControl = "no-cache"
Response.AddHeader "Pragma", "no-cache"
Response.Expires = -1

Dim g_usuario, g_tipo, g_esAdmin, g_esAjax
g_esAjax = (Request.ServerVariables("HTTP_X_REQUESTED_WITH") = "XMLHttpRequest")

' Responde según el tipo de petición: JSON para fetch(), redirect para páginas
Sub Denegar(codigo, textoHttp, claveJson, tipoFlash, mensaje, destino)
    If g_esAjax Then
        Response.Status = codigo & " " & textoHttp
        Response.ContentType = "application/json"
        Response.Write "{""ok"":false,""error"":""" & claveJson & """}"
    Else
        If mensaje <> "" Then SetFlash tipoFlash, mensaje
        Response.Redirect destino
    End If
    Response.End
End Sub

' 1) ¿Hay sesión? Si no -> login.asp
If Trim(Session("username") & "") = "" Then
    Denegar 401, "Unauthorized", "sesion", "", "", "login.asp?msg=sesion"
End If

g_usuario = Session("username") & ""
g_tipo = 0
If IsNumeric(Session("usertype")) Then g_tipo = CLng(Session("usertype"))
g_esAdmin = (g_tipo = 1)

' 2) Exigir rol admin (verificación en el SERVIDOR)
Sub ExigirAdmin()
    If Not g_esAdmin Then
        Denegar 403, "Forbidden", "permisos", "error", "No tienes permisos para realizar esa acción.", "songs.asp"
    End If
End Sub

' 3) Exigir método POST
Sub ExigirPost()
    If Request.ServerVariables("REQUEST_METHOD") <> "POST" Then
        Denegar 405, "Method Not Allowed", "metodo", "error", "Petición no válida.", "songs.asp"
    End If
End Sub

' 4) Token anti-CSRF (uno por sesión)
Sub AsegurarCsrf()
    Dim i, t
    If Session("csrf") = "" Then
        Randomize
        t = ""
        For i = 1 To 32
            t = t & Hex(Int(Rnd * 16))
        Next
        Session("csrf") = t
    End If
End Sub

Function CsrfValido(token)
    CsrfValido = (Len(token & "") > 0 And (token & "") = (Session("csrf") & ""))
End Function

Sub ExigirCsrf(token)
    If Not CsrfValido(token) Then
        Denegar 403, "Forbidden", "csrf", "error", "Token de seguridad inválido. Intenta de nuevo.", "songs.asp"
    End If
End Sub

AsegurarCsrf
%>
