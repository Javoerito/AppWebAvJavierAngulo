<%@ Page Title="Canciones" Language="C#" MasterPageFile="~/Site.Master" AutoEventWireup="true" CodeBehind="Song.aspx.cs" Inherits="WebAppPoliMusicV3.Song" %>

<asp:Content ID="Content1" ContentPlaceHolderID="MainContent" runat="server">

    <div class="d-flex align-items-center justify-content-between mt-4 mb-3">
        <h2 class="mb-0 text-success">&#9835; Canciones</h2>
        <span class="badge bg-success fs-6">PoliMusic</span>
    </div>

    <div class="mb-3">
        <asp:Label ID="lblMessage" runat="server" CssClass="fw-bold" ForeColor="Red"></asp:Label>
    </div>

    <%-- Formulario solo admin --%>
    <asp:Panel ID="pnlAdmin" runat="server" Visible="false" CssClass="card shadow-sm mb-4">
        <div class="card-header bg-success text-white">
            <asp:Label ID="lblFormTitle" runat="server" Text="Nueva canción" CssClass="fw-semibold"></asp:Label>
        </div>
        <div class="card-body">
            <asp:HiddenField ID="hfSongId" runat="server" Value="0" />
            <div class="row g-3">
                <div class="col-md-5">
                    <label class="form-label" for="<%= txtName.ClientID %>">Nombre de la canción *</label>
                    <asp:TextBox ID="txtName" runat="server" CssClass="form-control" placeholder="Ej: Adventure"></asp:TextBox>
                </div>
                <div class="col-md-7">
                    <label class="form-label" for="<%= fupSong.ClientID %>">Archivo MP3</label>
                    <asp:FileUpload ID="fupSong" runat="server" CssClass="form-control" accept=".mp3,audio/mpeg" />
                    <div class="form-text">Máx. 50 MB. Al editar, déjalo vacío para mantener el archivo actual.</div>
                </div>
            </div>
        </div>
        <div class="card-footer bg-transparent d-flex gap-2">
            <asp:Button ID="btnSave" runat="server" Text="Guardar" CssClass="btn btn-success" OnClick="btnSave_Click" />
            <asp:Button ID="btnCancel" runat="server" Text="Cancelar" CssClass="btn btn-outline-secondary" CausesValidation="false" OnClick="btnCancel_Click" />
        </div>
    </asp:Panel>

    <%-- Listado --%>
    <div class="card shadow-sm mb-5">
        <div class="card-header bg-dark text-white fw-semibold">Lista de canciones</div>
        <div class="table-responsive">
            <asp:GridView ID="gvSongs" runat="server" AutoGenerateColumns="false" DataKeyNames="ID_SONG"
                CssClass="table table-hover align-middle mb-0" GridLines="None"
                HeaderStyle-CssClass="table-light" OnRowCommand="gvSongs_RowCommand"
                EmptyDataText="No hay canciones registradas.">
                <Columns>
                    <asp:BoundField DataField="ID_SONG" HeaderText="#" ItemStyle-CssClass="text-muted" ItemStyle-Width="50px" />
                    <asp:BoundField DataField="SONG_NAME" HeaderText="Canción" ItemStyle-CssClass="fw-semibold" />
                    <asp:TemplateField HeaderText="Plays" ItemStyle-Width="110px">
                        <ItemTemplate>
                            <span class="badge rounded-pill bg-success">&#9654; <%# Eval("PLAYS") %></span>
                        </ItemTemplate>
                    </asp:TemplateField>
                    <asp:TemplateField HeaderText="Reproducir" ItemStyle-Width="340px">
                        <ItemTemplate>
                            <audio class="w-100" controls preload="none" src='<%# ResolveUrl(Eval("SONG_PATH").ToString()) %>'></audio>
                        </ItemTemplate>
                    </asp:TemplateField>
                    <asp:TemplateField HeaderText="Acciones" Visible="false" ItemStyle-Width="180px">
                        <ItemTemplate>
                            <div class="d-flex gap-1">
                                <asp:LinkButton runat="server" CommandName="EditSong" CommandArgument='<%# Eval("ID_SONG") %>'
                                    CssClass="btn btn-sm btn-outline-primary" CausesValidation="false">Editar</asp:LinkButton>
                                <asp:LinkButton runat="server" CommandName="DeleteSong" CommandArgument='<%# Eval("ID_SONG") %>'
                                    CssClass="btn btn-sm btn-outline-danger" CausesValidation="false"
                                    OnClientClick="return confirm('¿Eliminar esta canción?');">Eliminar</asp:LinkButton>
                            </div>
                        </ItemTemplate>
                    </asp:TemplateField>
                </Columns>
                <EmptyDataRowStyle CssClass="text-center text-muted p-4" />
            </asp:GridView>
        </div>
    </div>

</asp:Content>