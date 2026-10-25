<%@ Language="VBScript" CodePage="65001" %>
<%
' Cierra la sesión y vuelve al login
Session.Abandon
Response.Redirect "login.asp"
%>
