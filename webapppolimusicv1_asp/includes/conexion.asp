<%
' =====================================================================
' includes/conexion.asp
' Conexión a SQL Server (ADODB) + utilidades comunes de PoliMusic.
' Se incluye con:  <!--#include file="includes/conexion.asp" -->
' =====================================================================

' ---- Datos de conexión (cámbialos si tu servidor es otro) ------------
Const DB_SERVIDOR = "localhost"        ' Ej.: "localhost", ".\SQLEXPRESS", "MIPC\SQLEXPRESS"
Const DB_NOMBRE   = "BDD_PoliMusic"
Const DB_USUARIO  = "usr_polimusic"
Const DB_CLAVE    = "Politecnica1"

' ---- Constantes de ADO (en ASP clásico hay que declararlas) -----------
Const adInteger          = 3
Const adVarChar          = 200
Const adParamInput       = 1
Const adCmdText          = 1
Const adExecuteNoRecords = 128

' Abre y devuelve una conexión. Si falla, corta con un 500 genérico
' (no se muestran detalles técnicos al usuario).
Function AbrirConexion()
    Dim cn
    Set cn = Server.CreateObject("ADODB.Connection")
    On Error Resume Next
    ' OLEDB (SQLOLEDB viene en todos los Windows). Alternativa ODBC:
    ' cn.Open "Driver={ODBC Driver 17 for SQL Server};Server=" & DB_SERVIDOR & ";Database=" & DB_NOMBRE & ";Uid=" & DB_USUARIO & ";Pwd=" & DB_CLAVE & ";"
    cn.Open "Provider=SQLOLEDB;Data Source=" & DB_SERVIDOR & _
            ";Initial Catalog=" & DB_NOMBRE & _
            ";User ID=" & DB_USUARIO & _
            ";Password=" & DB_CLAVE & ";"
    If Err.Number <> 0 Then
        Response.Status = "500 Internal Server Error"
        Response.ContentType = "text/plain"
        Response.Write "No se pudo conectar a la base de datos. Revisa includes/conexion.asp"
        Response.End
    End If
    On Error GoTo 0
    Set AbrirConexion = cn
End Function

Sub CerrarConexion(cn)
    If IsObject(cn) Then
        If Not cn Is Nothing Then
            If cn.State = 1 Then
                cn.Close
            End If
        End If
    End If
    Set cn = Nothing
End Sub

' ---- Consultas parametrizadas ----------------------------------------
' Crea un ADODB.Command. Usa "?" como marcador; los parámetros se agregan
' EN EL MISMO ORDEN en que aparecen los "?".
Function NuevoCmd(cn, sql)
    Dim cmd
    Set cmd = Server.CreateObject("ADODB.Command")
    Set cmd.ActiveConnection = cn
    cmd.CommandText = sql
    cmd.CommandType = adCmdText
    Set NuevoCmd = cmd
End Function

Sub ParamInt(cmd, nombre, valor)
    cmd.Parameters.Append cmd.CreateParameter(nombre, adInteger, adParamInput, , CLng(valor))
End Sub

Sub ParamTexto(cmd, nombre, valor, largo)
    cmd.Parameters.Append cmd.CreateParameter(nombre, adVarChar, adParamInput, largo, CStr(valor))
End Sub

' ---- Utilidades -------------------------------------------------------
' Server.HTMLEncode seguro ante Null/Empty
Function Hx(s)
    Hx = Server.HTMLEncode(s & "")
End Function

' Devuelve un entero solo si el texto son 1-9 dígitos; si no, 0
Function SoloEntero(v)
    Dim re, s
    s = Trim(v & "")
    SoloEntero = 0
    Set re = CreateObject("VBScript.RegExp")
    re.Pattern = "^[0-9]{1,9}$"
    If re.Test(s) Then SoloEntero = CLng(s)
End Function

' "~/SongFiles/x.mp3"  ->  "assets/SongFiles/x.mp3"  (el "~/" del SQL = carpeta assets)
Function ConvertirRuta(ruta)
    Dim r
    r = Trim(ruta & "")
    If Left(r, 2) = "~/" Then r = "assets/" & Mid(r, 3)
    ConvertirRuta = r
End Function

' Devuelve la ruta de una imagen si el archivo existe; si no, la de respaldo
Function RutaImagen(ruta, porDefecto)
    Dim r, fso
    RutaImagen = porDefecto
    r = ConvertirRuta(ruta)
    If r = "" Then Exit Function
    If InStr(r, ":") > 0 Or InStr(r, "..") > 0 Then Exit Function
    On Error Resume Next
    Set fso = Server.CreateObject("Scripting.FileSystemObject")
    If fso.FileExists(Server.MapPath(r)) Then
        If Err.Number = 0 Then RutaImagen = r
    End If
    Err.Clear
    On Error GoTo 0
End Function

' Ruta de canción válida: empieza con "~/" o "assets/", sin "..", extensión de audio
Function RutaCancionValida(ruta)
    Dim re
    Set re = CreateObject("VBScript.RegExp")
    re.Pattern = "^(~|assets)/[A-Za-z0-9_\-\. /]+\.(mp3|ogg|wav|m4a)$"
    re.IgnoreCase = True
    RutaCancionValida = (re.Test(ruta) And InStr(ruta, "..") = 0)
End Function

' ---- Mensajes "flash" (éxito / error tras cada operación) -------------
Sub SetFlash(tipo, mensaje)
    Session("flash_tipo") = tipo      ' "ok" o "error"
    Session("flash_msg") = mensaje
End Sub

Function HtmlFlash()
    Dim t, m, rol
    t = Session("flash_tipo")
    m = Session("flash_msg")
    HtmlFlash = ""
    If m <> "" Then
        rol = "status"
        If t = "error" Then rol = "alert"
        HtmlFlash = "<div class=""flash flash-" & Hx(t) & """ role=""" & rol & """>" & _
                    "<span>" & Hx(m) & "</span>" & _
                    "<button type=""button"" class=""flash-close"" aria-label=""Cerrar mensaje"">&times;</button></div>"
    End If
    Session("flash_tipo") = ""
    Session("flash_msg") = ""
End Function
%>
