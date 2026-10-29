using System;
using System.Collections.Generic;
using System.Data;
using System.Web;

namespace WebAppPoliMusicV2.BLL
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
            return new DAL.Song(strConnectionString).Save(song);
        }
        public DataTable Read()
        {
            return new DAL.Song(strConnectionString).Read();
        }
        public DataTable ReadById(int id)
        {
            return new DAL.Song(strConnectionString).ReadById(id);
        }
        public int Update(Entities.Song song)
        {
            return new DAL.Song(strConnectionString).Update(song);
        }
        public int Delete(int id)
        {
            return new DAL.Song(strConnectionString).Delete(id);
        }
        public int IncrementPlays(int id)
        {
            return new DAL.Song(strConnectionString).IncrementPlays(id);
        }
    }
}