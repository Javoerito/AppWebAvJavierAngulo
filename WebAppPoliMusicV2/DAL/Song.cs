using System;
using System.Collections.Generic;
using System.Data;
using System.Data.SqlClient;
using System.Web;

namespace WebAppPoliMusicV2.DAL
{
    public class Song
    {
        private string strConnectionString;
        public Song(string strConnString)
        {
            strConnectionString = strConnString;
        }

        public int Save(Entities.Song song)
        {
            using (SqlConnection con = new SqlConnection(strConnectionString))
            using (SqlCommand cmd = new SqlCommand("INSERT INTO [TBL_SONG]([SONG_NAME],[SONG_PATH],[PLAYS]) VALUES(@SONG_NAME,@SONG_PATH,0)", con))
            {
                cmd.Parameters.AddWithValue("@SONG_NAME", song.Name);
                cmd.Parameters.AddWithValue("@SONG_PATH", song.Path);
                con.Open();
                return cmd.ExecuteNonQuery();
            }
        }

        public DataTable Read()
        {
            DataTable dt = new DataTable();
            using (SqlConnection con = new SqlConnection(strConnectionString))
            using (SqlCommand cmd = new SqlCommand("SELECT [ID_SONG],[SONG_NAME],[SONG_PATH],ISNULL([PLAYS],0) AS [PLAYS] FROM [TBL_SONG] ORDER BY [SONG_NAME]", con))
            using (SqlDataAdapter sda = new SqlDataAdapter(cmd))
            {
                sda.Fill(dt);
                return dt;
            }
        }

        public DataTable ReadById(int id)
        {
            DataTable dt = new DataTable();
            using (SqlConnection con = new SqlConnection(strConnectionString))
            using (SqlCommand cmd = new SqlCommand("SELECT [ID_SONG],[SONG_NAME],[SONG_PATH],ISNULL([PLAYS],0) AS [PLAYS] FROM [TBL_SONG] WHERE [ID_SONG] = @ID_SONG", con))
            {
                cmd.Parameters.AddWithValue("@ID_SONG", id);
                using (SqlDataAdapter sda = new SqlDataAdapter(cmd))
                {
                    sda.Fill(dt);
                    return dt;
                }
            }
        }

        public int Update(Entities.Song song)
        {
            using (SqlConnection con = new SqlConnection(strConnectionString))
            using (SqlCommand cmd = new SqlCommand())
            {
                string sentence = "UPDATE [TBL_SONG] SET [SONG_NAME] = @SONG_NAME";
                if (!string.IsNullOrEmpty(song.Path))
                {
                    sentence += ", [SONG_PATH] = @SONG_PATH";
                }
                sentence += " WHERE [ID_SONG] = @ID_SONG";
                cmd.CommandText = sentence;
                cmd.Parameters.AddWithValue("@ID_SONG", song.ID);
                cmd.Parameters.AddWithValue("@SONG_NAME", song.Name);
                if (!string.IsNullOrEmpty(song.Path))
                {
                    cmd.Parameters.AddWithValue("@SONG_PATH", song.Path);
                }
                cmd.Connection = con;
                con.Open();
                return cmd.ExecuteNonQuery();
            }
        }

        public int Delete(int id)
        {
            using (SqlConnection con = new SqlConnection(strConnectionString))
            using (SqlCommand cmd = new SqlCommand("DELETE [TBL_SONG] WHERE [ID_SONG] = @ID_SONG", con))
            {
                cmd.Parameters.AddWithValue("@ID_SONG", id);
                con.Open();
                return cmd.ExecuteNonQuery();
            }
        }

        public int IncrementPlays(int id)
        {
            using (SqlConnection con = new SqlConnection(strConnectionString))
            using (SqlCommand cmd = new SqlCommand("UPDATE [TBL_SONG] SET [PLAYS] = ISNULL([PLAYS],0) + 1 WHERE [ID_SONG] = @ID_SONG", con))
            {
                cmd.Parameters.AddWithValue("@ID_SONG", id);
                con.Open();
                return cmd.ExecuteNonQuery();
            }
        }
    }
}