-- =====================================================================
-- actualizar_rutas.sql  (ejecutar en SSMS sobre BDD_PoliMusic)
-- Solo existe bensound-adventure.mp3, así que todas las canciones
-- apuntan a ese archivo. Se respetan mayúsculas de carpetas del ZIP.
-- =====================================================================
USE BDD_PoliMusic;
GO

-- Canciones: todas usan el único mp3 disponible
UPDATE TBL_SONG SET SONG_PATH = '~/SongFiles/bensound-adventure.mp3';

-- Fotos de usuario (solo existen default.jpg y root.png)
UPDATE TBL_USER SET USER_PHOTO = '~/UserImages/default.jpg' WHERE USERNAME IN ('userNormal', 'username1');
UPDATE TBL_USER SET USER_PHOTO = '~/UserImages/root.png'    WHERE USERNAME = 'userAdmin';
GO

-- (Opcional) Dejar solo "Adventure": borra primero las tablas hijas
-- DELETE FROM TBL_TRACKLIST     WHERE ID_SONG <> 1;
-- DELETE FROM TBL_PLAYER        WHERE ID_SONG <> 1;
-- DELETE FROM TBL_PLAYLIST_SONG WHERE ID_SONG <> 1;
-- DELETE FROM TBL_SONG          WHERE ID_SONG <> 1;

SELECT ID_SONG, SONG_NAME, SONG_PATH, PLAYS FROM TBL_SONG;
SELECT USERNAME, USER_PHOTO, USER_TYPE FROM TBL_USER;
GO
