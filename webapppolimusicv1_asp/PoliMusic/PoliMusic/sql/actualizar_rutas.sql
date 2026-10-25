-- ============================================================
-- sql/actualizar_rutas.sql
-- Apunta TODAS las canciones al único mp3 disponible.
-- "~/" se traduce en la web a la carpeta /assets/ del sitio.
-- ============================================================
USE BDD_PoliMusic;
GO

UPDATE TBL_SONG
   SET SONG_PATH = '~/SongFiles/bensound-adventure.mp3';
GO

-- (Opcional) Dejar solo "Adventure" borrando primero las referencias por FK:
-- DELETE FROM TBL_TRACKLIST     WHERE ID_SONG NOT IN (SELECT TOP 1 ID_SONG FROM TBL_SONG ORDER BY ID_SONG);
-- DELETE FROM TBL_PLAYER        WHERE ID_SONG NOT IN (SELECT TOP 1 ID_SONG FROM TBL_SONG ORDER BY ID_SONG);
-- DELETE FROM TBL_PLAYLIST_SONG WHERE ID_SONG NOT IN (SELECT TOP 1 ID_SONG FROM TBL_SONG ORDER BY ID_SONG);
-- DELETE FROM TBL_SONG          WHERE ID_SONG NOT IN (SELECT TOP 1 ID_SONG FROM TBL_SONG ORDER BY ID_SONG);

-- Permisos mínimos para el usuario de la aplicación
GRANT SELECT, INSERT, UPDATE, DELETE ON TBL_SONG          TO usr_polimusic;
GRANT DELETE                         ON TBL_TRACKLIST     TO usr_polimusic;
GRANT DELETE                         ON TBL_PLAYER        TO usr_polimusic;
GRANT DELETE                         ON TBL_PLAYLIST_SONG TO usr_polimusic;
GRANT SELECT                         ON TBL_USER          TO usr_polimusic;
GO

SELECT ID_SONG, SONG_NAME, SONG_PATH, PLAYS FROM TBL_SONG;
