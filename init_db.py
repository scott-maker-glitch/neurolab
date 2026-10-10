"""
Script de inicialización de la base de datos.
Ejecutar UNA SOLA VEZ con: python init_db.py
"""

import sqlite3
import os

DB_PATH = "database.db"

def crear_base_de_datos():
    if os.path.exists(DB_PATH):
        print(f"⚠️  La base de datos '{DB_PATH}' ya existe.")
        respuesta = input("¿Deseas borrarla y crearla de nuevo? (s/n): ").lower()
        if respuesta != "s":
            print("❌ Operación cancelada.")
            return
        os.remove(DB_PATH)
        print(f"🗑️  Base de datos anterior eliminada.")

    conexion = sqlite3.connect(DB_PATH)
    cursor = conexion.cursor()

    # Tabla de usuarios
    cursor.execute("""
        CREATE TABLE usuarios (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre_usuario TEXT UNIQUE NOT NULL,
            contrasena_hash TEXT NOT NULL,
            fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # Tabla de progreso (una fila por usuario)
    cursor.execute("""
        CREATE TABLE progreso (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            usuario_id INTEGER UNIQUE NOT NULL,
            nivel_actual INTEGER DEFAULT 1,
            cm_total INTEGER DEFAULT 0,
            titulo_actual TEXT DEFAULT 'Novato',
            vidas INTEGER DEFAULT 3,
            ultima_perdida_vida TIMESTAMP,
            fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (usuario_id) REFERENCES usuarios (id)
        )
    """)

    # Tabla de niveles completados
    cursor.execute("""
        CREATE TABLE niveles_completados (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            usuario_id INTEGER NOT NULL,
            nivel INTEGER NOT NULL,
            cm_obtenido INTEGER DEFAULT 0,
            insignia TEXT,
            fecha_completado TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (usuario_id) REFERENCES usuarios (id),
            UNIQUE(usuario_id, nivel)
        )
    """)

    conexion.commit()
    conexion.close()
    print(f"✅ Base de datos '{DB_PATH}' creada correctamente.")
    print("📋 Tablas creadas: usuarios, progreso, niveles_completados")

if __name__ == "__main__":
    crear_base_de_datos()