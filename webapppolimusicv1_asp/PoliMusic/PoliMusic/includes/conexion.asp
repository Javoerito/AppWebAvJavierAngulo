<%
' ============================================================
' includes/conexion.asp
' Conexión a SQL Server (BDD_PoliMusic) + ayudantes para consultas
' parametrizadas. NUNCA se concatenan datos del usuario en el SQL.
' ============================================================
Const adVarChar = 200
Const adInteger = 3
Const adParamInput = 1
Const adCmdText = 1
Const adExecuteNoRecords = 128

Dim cn

Sub AbrirConexion()
  Dim cs
  ' >>> Cambia "localhost" por tu servidor o instancia (ej.: .\SQLEXPRESS)
  cs = "Provider=SQLOLEDB;Data Source=localhost;Initial Catalog=BDD_PoliMusic;" & _
       "User ID=usr_polimusic;Password=Politecnica1;"
  ' Alternativa ODBC:
  ' cs = "Driver={ODBC Driver 17 for SQL Server};Server=localhost;Database=BDD_PoliMusic;Uid=usr_polimusic;Pwd=Politecnica1;"
  Set cn = Server.CreateObject("ADODB.Connection")
  cn.ConnectionTimeout = 10
  cn.Open cs
End Sub

Sub CerrarConexion()
  If IsObject(cn) Then
    If cn.State = 1 Then cn.Close
    Set cn = Nothing
  End If
End Sub

' Crea un ADODB.Command de texto sobre la conexión abierta (usa "?" como marcador)
Function NuevoCmd(sql)
  Dim c
  Set c = Server.CreateObject("ADODB.Command")
  Set c.ActiveConnection = cn
  c.CommandText = sql
  c.CommandType = adCmdText
  Set NuevoCmd = c
End Function

' Parámetro entero
Sub PInt(c, nombre, valor)
  c.Parameters.Append c.CreateParameter(nombre, adInteger, adParamInput, 4, CLng(valor))
End Sub

' Parámetro de texto (largo = tamaño máximo de la columna)
Sub PStr(c, nombre, valor, largo)
  If largo < 1 Then largo = 1
  c.Parameters.Append c.CreateParameter(nombre, adVarChar, adParamInput, largo, Left(CStr(valor & ""), largo))
End Sub

' Ejecuta un comando de una sola condición ID = ? sin devolver filas
Sub EjecutarConId(sql, id)
  Dim c
  Set c = NuevoCmd(sql)
  PInt c, "@id", id
  c.Execute , , adExecuteNoRecords
  Set c = Nothing
End Sub

' Foto del usuario logueado; si no existe el archivo -> imagen por defecto
Function ObtenerFotoUsuario(usuario)
  Dim c, rs, ruta
  ruta = ""
  Set c = NuevoCmd("SELECT USER_PHOTO FROM TBL_USER WHERE USERNAME = ?")
  PStr c, "@u", usuario, 255
  Set rs = c.Execute
  If Not rs.EOF Then ruta = ResolverRuta(rs("USER_PHOTO") & "")
  rs.Close
  If Not ArchivoExiste(ruta) Then ruta = "assets/UserImages/default.jpg"
  ObtenerFotoUsuario = ruta
End Function
%>
