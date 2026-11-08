<%@ Page Language="C#" AutoEventWireup="true" CodeBehind="SignUp.aspx.cs" Inherits="WebAppPoliMusicV3.SignUp" %>

<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head runat="server">
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>PoliMusic - Registro</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet" />
    <style>
        body { background: linear-gradient(135deg, #0f2027, #1db954); min-height: 100vh; }
    </style>
</head>
<body class="d-flex align-items-center justify-content-center py-4">
    <form id="formLogin" runat="server" class="w-100" style="max-width: 560px;">
        <div class="card shadow-lg border-0">
            <div class="card-body p-4">
                <div class="text-center mb-4">
                    <div class="display-5 text-success">&#9835;</div>
                    <h3 class="fw-bold mb-0">Crear cuenta</h3>
                    <small class="text-muted">Regístrate en PoliMusic</small>
                </div>

                <div class="row g-3">
                    <div class="col-md-6">
                        <label class="form-label" for="<%= txtUserName.ClientID %>">User name *</label>
                        <asp:TextBox ID="txtUserName" runat="server" CssClass="form-control"></asp:TextBox>
                    </div>
                    <div class="col-md-6">
                        <label class="form-label" for="<%= txtEmail.ClientID %>">Email *</label>
                        <asp:TextBox ID="txtEmail" runat="server" CssClass="form-control" TextMode="Email"></asp:TextBox>
                    </div>
                    <div class="col-md-6">
                        <label class="form-label" for="<%= txtPassword.ClientID %>">Password *</label>
                        <asp:TextBox ID="txtPassword" runat="server" TextMode="Password" CssClass="form-control"></asp:TextBox>
                    </div>
                    <div class="col-md-6">
                        <label class="form-label" for="<%= txtConfirmPassword.ClientID %>">Confirm Password *</label>
                        <asp:TextBox ID="txtConfirmPassword" runat="server" TextMode="Password" CssClass="form-control"></asp:TextBox>
                    </div>
                    <div class="col-md-6">
                        <label class="form-label" for="<%= txtBirthDate.ClientID %>">Birth Date</label>
                        <asp:TextBox ID="txtBirthDate" runat="server" CssClass="form-control" placeholder="dd/MM/yyyy"></asp:TextBox>
                    </div>
                    <div class="col-md-6">
                        <label class="form-label" for="<%= fupPhoto.ClientID %>">Photo</label>
                        <asp:FileUpload ID="fupPhoto" runat="server" CssClass="form-control" accept=".jpg,.jpeg,.png" />
                    </div>
                </div>

                <div class="d-grid mt-4">
                    <asp:Button ID="btnSumbit" runat="server" Text="Submit" CssClass="btn btn-success py-2" OnClick="btnSumbit_Click" />
                </div>

                <div class="text-center mt-3">
                    <asp:HyperLink ID="HyperLink1" NavigateUrl="~/Login.aspx" runat="server" CssClass="link-success">Back to Login</asp:HyperLink>
                </div>

                <asp:Panel ID="frmConfirmation" Visible="true" runat="server" CssClass="text-center mt-3">
                    <asp:Label ID="lblMessage" ForeColor="Red" Font-Bold="true" runat="server"></asp:Label>
                </asp:Panel>
            </div>
        </div>
    </form>
</body>
</html>
