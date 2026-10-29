using System;
using System.Collections.Generic;
using System.Configuration;
using System.Data;
using System.IO;
using System.Text.RegularExpressions;
using System.Web;
using System.Web.UI;
using System.Web.UI.WebControls;

namespace WebAppPoliMusicV2
{
    public partial class Song : System.Web.UI.Page, System.Web.UI.ICallbackEventHandler
    {
        string strConnString = ConfigurationManager.ConnectionStrings["BDD_PoliMusicConnectionString"].ConnectionString;
        const string SONG_FOLDER = "~/SongFiles/";

        private Entities.User CurrentUser
        {
            get { return Session[Util.Constants.USER] as Entities.User; }
        }
        private bool IsAdmin
        {
            get { return CurrentUser != null && CurrentUser.UserType == Util.Constants.ID_USER_ADMIN; }
        }

        protected void Page_Load(object sender, EventArgs e)
        {
            if (CurrentUser == null)
            {
                Response.Redirect("Login.aspx", true);
                return;
            }

            // Callback para sumar reproducciones sin recargar la página
            string cb = ClientScript.GetCallbackEventReference(this, "id", "function(){}", "null");
            ClientScript.RegisterClientScriptBlock(GetType(), "registerPlay",
                "function registerPlay(id){" + cb + ";}", true);

            pnlAdmin.Visible = IsAdmin;
            if (!Page.IsPostBack)
            {
                lblUser.Text = CurrentUser.UserName;
                BindGrid();
            }
        }

        // ICallbackEventHandler
        public void RaiseCallbackEvent(string eventArgument)
        {
            int id;
            if (int.TryParse(eventArgument, out id))
            {
                new BLL.Song(strConnString).IncrementPlays(id);
            }
        }
        public string GetCallbackResult()
        {
            return "ok";
        }

        private void BindGrid()
        {
            gvSongs.DataSource = new BLL.Song(strConnString).Read();
            gvSongs.DataBind();
        }

        protected void gvSongs_RowDataBound(object sender, GridViewRowEventArgs e)
        {
            if (e.Row.RowType == DataControlRowType.DataRow || e.Row.RowType == DataControlRowType.Header)
            {
                // La columna "Admin" (última) solo se ve para administradores
                e.Row.Cells[e.Row.Cells.Count - 1].Visible = IsAdmin;
            }
        }

        protected void gvSongs_RowCommand(object sender, GridViewCommandEventArgs e)
        {
            if (!IsAdmin) return;
            if (e.CommandName != "EditSong" && e.CommandName != "DeleteSong") return;

            int id = Convert.ToInt32(e.CommandArgument);
            BLL.Song bll = new BLL.Song(strConnString);
            DataTable dt = bll.ReadById(id);
            if (dt.Rows.Count == 0) return;

            if (e.CommandName == "EditSong")
            {
                hfID.Value = id.ToString();
                txtName.Text = dt.Rows[0]["SONG_NAME"].ToString();
                lblFormTitle.Text = "Edit song (deja el MP3 vacío para conservar el actual)";
                lblMessage.Text = string.Empty;
            }
            else
            {
                try
                {
                    string songPath = dt.Rows[0]["SONG_PATH"].ToString();
                    bll.Delete(id);
                    string physical = Server.MapPath(songPath);
                    if (File.Exists(physical)) File.Delete(physical);
                    lblMessage.ForeColor = System.Drawing.Color.LightGreen;
                    lblMessage.Text = "Song deleted.";
                    BindGrid();
                }
                catch (Exception ex)
                {
                    lblMessage.ForeColor = System.Drawing.Color.Red;
                    lblMessage.Text = "Could not delete: " + ex.Message;
                }
            }
        }

        protected void btnSave_Click(object sender, EventArgs e)
        {
            if (!IsAdmin) return;
            lblMessage.ForeColor = System.Drawing.Color.Red;

            string name = txtName.Text.Trim();
            if (name == string.Empty) { lblMessage.Text = "Song name is required!"; return; }
            if (name.Length > 50) { lblMessage.Text = "Song name must be 50 characters max!"; return; }

            int id = Convert.ToInt32(hfID.Value);
            bool isNew = (id == 0);
            if (isNew && !fupSong.HasFile) { lblMessage.Text = "Select a song file first!"; return; }

            Entities.Song song = new Entities.Song();
            song.ID = id;
            song.Name = name;
            song.Path = string.Empty;

            if (fupSong.HasFile)
            {
                string baseName = Regex.Replace(name, @"[^a-zA-Z0-9]", "") + "_" + DateTime.Now.Ticks;
                string error = new FileManagement().SaveSongOnServer(fupSong, SONG_FOLDER, baseName);
                if (error != string.Empty) { lblMessage.Text = error; return; }
                song.Path = SONG_FOLDER + baseName + ".mp3";
            }

            try
            {
                BLL.Song bll = new BLL.Song(strConnString);
                if (isNew) bll.Save(song); else bll.Update(song);
                lblMessage.ForeColor = System.Drawing.Color.LightGreen;
                lblMessage.Text = "Song saved successfully!";
                ClearForm();
                BindGrid();
            }
            catch (Exception ex)
            {
                lblMessage.Text = "Could not save: " + ex.Message;
            }
        }

        protected void btnCancel_Click(object sender, EventArgs e)
        {
            ClearForm();
            lblMessage.Text = string.Empty;
        }

        private void ClearForm()
        {
            hfID.Value = "0";
            txtName.Text = string.Empty;
            lblFormTitle.Text = "Add new song";
        }
    }
}