"""
Servidor Flask del juego de psicología.
Ejecutar con: python app.py
"""

from flask import Flask, render_template, request, redirect, url_for, jsonify, session
from flask_login import LoginManager, UserMixin, login_user, login_required, logout_user, current_user
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime, timedelta
import sqlite3
import json
import os

# ============================================================
# CONFIGURACIÓN INICIAL
# ============================================================

app = Flask(__name__)
app.secret_key = "cambia_esta_clave_por_algo_secreto_y_largo_2024"  # ⚠️ Cambiar en producción

DB_PATH = "database.db"
NIVELES_PATH = os.path.join("data", "niveles.json")
LECTURAS_PATH = os.path.join("data", "lecturas")

VIDAS_MAXIMAS = 5
TIEMPO_REGENERACION_SEGUNDOS = 60

login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = "login"

# ============================================================
# CARGA DE NIVELES
# ============================================================

def cargar_niveles():
    """Carga el archivo niveles.json completo."""
    with open(NIVELES_PATH, "r", encoding="utf-8") as f:
        return json.load(f)

def cargar_lectura(archivo_relativo):
    """Carga el contenido de un archivo .txt de lectura."""
    ruta = os.path.join("data", archivo_relativo)
    with open(ruta, "r", encoding="utf-8") as f:
        return f.read()

# ============================================================
# CONEXIÓN A BASE DE DATOS
# ============================================================

def get_db():
    conexion = sqlite3.connect(DB_PATH)
    conexion.row_factory = sqlite3.Row
    return conexion

def inicializar_base_datos():
    """Crea las tablas si no existen. Se ejecuta al arrancar la app."""
    conexion = sqlite3.connect(DB_PATH)
    cursor = conexion.cursor()

    # Tabla de usuarios
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS usuarios (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre_usuario TEXT UNIQUE NOT NULL,
            contrasena_hash TEXT NOT NULL,
            fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # Tabla de progreso
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS progreso (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            usuario_id INTEGER UNIQUE NOT NULL,
            nivel_actual INTEGER DEFAULT 1,
            cm_total INTEGER DEFAULT 0,
            titulo_actual TEXT DEFAULT 'Novato',
            vidas INTEGER DEFAULT 5,
            ultima_perdida_vida TIMESTAMP,
            fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (usuario_id) REFERENCES usuarios (id)
        )
    """)

    # Tabla de niveles completados
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS niveles_completados (
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
    print("✅ Base de datos inicializada correctamente.")

# ============================================================
# MODELO DE USUARIO
# ============================================================

class Usuario(UserMixin):
    def __init__(self, id, nombre_usuario):
        self.id = id
        self.nombre_usuario = nombre_usuario

@login_manager.user_loader
def load_user(user_id):
    conexion = get_db()
    cursor = conexion.cursor()
    cursor.execute("SELECT id, nombre_usuario FROM usuarios WHERE id = ?", (user_id,))
    fila = cursor.fetchone()
    conexion.close()
    if fila:
        return Usuario(fila["id"], fila["nombre_usuario"])
    return None

# ============================================================
# UTILIDADES
# ============================================================

def obtener_saludo():
    """Devuelve un saludo según la hora actual."""
    hora = datetime.now().hour
    if 5 <= hora < 12:
        return "Buenos días"
    elif 12 <= hora < 19:
        return "Buenas tardes"
    else:
        return "Buenas noches"

def obtener_progreso(usuario_id):
    """Devuelve la fila de progreso del usuario, regenerando vidas si corresponde."""
    conexion = get_db()
    cursor = conexion.cursor()
    cursor.execute("SELECT * FROM progreso WHERE usuario_id = ?", (usuario_id,))
    progreso = cursor.fetchone()

    if not progreso:
        conexion.close()
        return None

    progreso = dict(progreso)

    # Inicializar el campo de segundos restantes (por defecto 0)
    progreso["segundos_para_vida"] = 0

    # Regeneración de vidas (1 minuto por vida, máximo 5)
    if progreso["vidas"] < VIDAS_MAXIMAS and progreso["ultima_perdida_vida"]:
        ultima = datetime.fromisoformat(progreso["ultima_perdida_vida"])
        ahora = datetime.now()
        segundos_pasados = (ahora - ultima).total_seconds()
        vidas_recuperadas = int(segundos_pasados // TIEMPO_REGENERACION_SEGUNDOS)

        if vidas_recuperadas > 0:
            nuevas_vidas = min(VIDAS_MAXIMAS, progreso["vidas"] + vidas_recuperadas)

            if nuevas_vidas >= VIDAS_MAXIMAS:
                nuevo_timestamp = None
            else:
                nuevo_timestamp = (ultima + timedelta(seconds=vidas_recuperadas * TIEMPO_REGENERACION_SEGUNDOS)).isoformat()

            cursor.execute(
                "UPDATE progreso SET vidas = ?, ultima_perdida_vida = ? WHERE usuario_id = ?",
                (nuevas_vidas, nuevo_timestamp, usuario_id)
            )
            conexion.commit()
            progreso["vidas"] = nuevas_vidas
            progreso["ultima_perdida_vida"] = nuevo_timestamp
        else:
            # No se recuperó vida todavía: calcular cuántos segundos faltan
            segundos_restantes = TIEMPO_REGENERACION_SEGUNDOS - (segundos_pasados % TIEMPO_REGENERACION_SEGUNDOS)
            progreso["segundos_para_vida"] = int(segundos_restantes)

    conexion.close()
    return progreso

# ============================================================
# RUTAS DE AUTENTICACIÓN
# ============================================================

@app.route("/")
def index():
    if current_user.is_authenticated:
        return redirect(url_for("menu"))
    return redirect(url_for("login"))

@app.route("/registro", methods=["GET", "POST"])
def registro():
    if request.method == "POST":
        nombre = request.form.get("nombre", "").strip()
        contrasena = request.form.get("contrasena", "").strip()

        if not nombre or not contrasena:
            return render_template("registro.html", error="Todos los campos son obligatorios.")

        if len(contrasena) < 4:
            return render_template("registro.html", error="La contraseña debe tener al menos 4 caracteres.")

        conexion = get_db()
        cursor = conexion.cursor()

        cursor.execute("SELECT id FROM usuarios WHERE nombre_usuario = ?", (nombre,))
        if cursor.fetchone():
            conexion.close()
            return render_template("registro.html", error="Ese nombre de usuario ya existe.")

        hash_contrasena = generate_password_hash(contrasena)
        cursor.execute(
            "INSERT INTO usuarios (nombre_usuario, contrasena_hash) VALUES (?, ?)",
            (nombre, hash_contrasena)
        )
        usuario_id = cursor.lastrowid

        cursor.execute(
            "INSERT INTO progreso (usuario_id, nivel_actual, cm_total, vidas, titulo_actual) VALUES (?, 1, 0, ?, 'Novato')",
            (usuario_id, VIDAS_MAXIMAS)
        )

        conexion.commit()
        conexion.close()

        return redirect(url_for("login"))

    return render_template("registro.html")

@app.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        nombre = request.form.get("nombre", "").strip()
        contrasena = request.form.get("contrasena", "").strip()

        conexion = get_db()
        cursor = conexion.cursor()
        cursor.execute("SELECT * FROM usuarios WHERE nombre_usuario = ?", (nombre,))
        fila = cursor.fetchone()
        conexion.close()

        if fila and check_password_hash(fila["contrasena_hash"], contrasena):
            usuario = Usuario(fila["id"], fila["nombre_usuario"])
            login_user(usuario)
            return redirect(url_for("menu"))

        return render_template("login.html", error="Usuario o contraseña incorrectos.")

    return render_template("login.html")

@app.route("/logout")
@login_required
def logout():
    logout_user()
    return redirect(url_for("login"))

# ============================================================
# RUTAS DEL JUEGO
# ============================================================

@app.route("/menu")
@login_required
def menu():
    progreso = obtener_progreso(current_user.id)
    niveles_data = cargar_niveles()

    cm_maximo = sum(n["cm_base"] + n["cm_bonus_tiempo"] for n in niveles_data["niveles"])
    porcentaje_progreso = int((progreso["cm_total"] / cm_maximo) * 100) if cm_maximo > 0 else 0

    return render_template(
        "menu.html",
        nombre=current_user.nombre_usuario,
        saludo=obtener_saludo(),
        progreso=progreso,
        total_niveles=len(niveles_data["niveles"]),
        niveles=niveles_data["niveles"],
        cm_maximo=cm_maximo,
        porcentaje_progreso=porcentaje_progreso,
        sin_vidas=(progreso["vidas"] <= 0)
    )

@app.route("/nivel/<int:num_nivel>")
@login_required
def nivel(num_nivel):
    progreso = obtener_progreso(current_user.id)
    niveles_data = cargar_niveles()

    if num_nivel < 1 or num_nivel > len(niveles_data["niveles"]):
        return redirect(url_for("menu"))

    if num_nivel > progreso["nivel_actual"]:
        return redirect(url_for("menu"))

    # ⚠️ Si no tiene vidas, no puede jugar
    if progreso["vidas"] <= 0:
        return render_template("sin_vidas.html", progreso=progreso)

    datos_nivel = niveles_data["niveles"][num_nivel - 1]
    lectura = cargar_lectura(datos_nivel["archivo_lectura"])

    return render_template(
        "nivel.html",
        nivel=datos_nivel,
        lectura=lectura,
        progreso=progreso
    )

@app.route("/api/estado_vidas")
@login_required
def estado_vidas():
    """Devuelve el estado actual de las vidas del usuario (para el contador en vivo)."""
    progreso = obtener_progreso(current_user.id)
    return jsonify({
        "vidas": progreso["vidas"],
        "vidas_maximas": VIDAS_MAXIMAS,
        "segundos_para_vida": progreso["segundos_para_vida"],
        "sin_vidas": progreso["vidas"] <= 0
    })

@app.route("/api/validar_respuesta", methods=["POST"])
@login_required
def validar_respuesta():
    """Valida una respuesta enviada desde el frontend."""
    datos = request.get_json()
    num_nivel = datos.get("nivel")
    indice = datos.get("indice")
    respuesta = datos.get("respuesta", "").strip().lower()

    niveles_data = cargar_niveles()
    datos_nivel = niveles_data["niveles"][num_nivel - 1]
    tipo = datos_nivel["tipo_puzzle"]

    correcto = False
    respuesta_correcta = None

    if tipo == "completar_frase":
        frase = datos_nivel["puzzle"]["frases"][indice]
        respuesta_correcta = frase["respuesta"].lower()
        correcto = (respuesta == respuesta_correcta)

    elif tipo == "verdadero_falso":
        afirmacion = datos_nivel["puzzle"]["afirmaciones"][indice]
        respuesta_correcta = afirmacion["respuesta"]
        correcto = (respuesta == str(respuesta_correcta).lower())

    elif tipo == "sopa_de_letras":
        palabra_buscada = datos_nivel["puzzle"]["palabras"][indice]
        respuesta_correcta = palabra_buscada.lower()
        correcto = (respuesta == respuesta_correcta)

    elif tipo == "memorama_conceptual":
        par = datos_nivel["puzzle"]["pares"][indice]
        respuesta_correcta = par["definicion"].lower()
        correcto = (respuesta == respuesta_correcta)

    elif tipo == "crucigrama":
        palabra = datos_nivel["puzzle"]["palabras"][indice]
        respuesta_correcta = palabra["palabra"].lower()
        correcto = (respuesta == respuesta_correcta)

    return jsonify({
        "correcto": correcto,
        "respuesta_correcta": respuesta_correcta if not correcto else None
    })

@app.route("/api/perder_vida", methods=["POST"])
@login_required
def perder_vida():
    """Resta una vida al usuario y actualiza el timestamp."""
    conexion = get_db()
    cursor = conexion.cursor()
    cursor.execute("SELECT vidas FROM progreso WHERE usuario_id = ?", (current_user.id,))
    fila = cursor.fetchone()
    vidas_actuales = fila["vidas"]

    if vidas_actuales > 0:
        nuevas_vidas = vidas_actuales - 1
        cursor.execute(
            "UPDATE progreso SET vidas = ?, ultima_perdida_vida = ? WHERE usuario_id = ?",
            (nuevas_vidas, datetime.now().isoformat(), current_user.id)
        )
        conexion.commit()
        conexion.close()
        return jsonify({
            "vidas": nuevas_vidas,
            "mensaje": "Vida perdida",
            "sin_vidas": nuevas_vidas <= 0
        })

    conexion.close()
    return jsonify({"vidas": 0, "mensaje": "Sin vidas disponibles", "sin_vidas": True})

@app.route("/api/completar_nivel", methods=["POST"])
@login_required
def completar_nivel():
    """Marca un nivel como completado y suma los CM."""
    datos = request.get_json()
    num_nivel = datos.get("nivel")
    cm_obtenido = datos.get("cm", 0)

    print(f"[DEBUG] Completando nivel {num_nivel} con CM {cm_obtenido}")

    niveles_data = cargar_niveles()
    datos_nivel = niveles_data["niveles"][num_nivel - 1]

    conexion = get_db()
    cursor = conexion.cursor()

    cursor.execute(
        "SELECT id FROM niveles_completados WHERE usuario_id = ? AND nivel = ?",
        (current_user.id, num_nivel)
    )
    ya_completado = cursor.fetchone()

    if not ya_completado:
        cursor.execute(
            "INSERT INTO niveles_completados (usuario_id, nivel, cm_obtenido, insignia) VALUES (?, ?, ?, ?)",
            (current_user.id, num_nivel, cm_obtenido, datos_nivel["insignia"])
        )
        print(f"[DEBUG] Insertado nivel {num_nivel} con {cm_obtenido} CM")
    else:
        print(f"[DEBUG] Nivel {num_nivel} ya estaba completado, sumando CM igual")

    cursor.execute(
        "UPDATE progreso SET cm_total = cm_total + ?, nivel_actual = ? WHERE usuario_id = ?",
        (cm_obtenido, num_nivel + 1, current_user.id)
    )

    if datos_nivel.get("titulo_desbloqueado"):
        cursor.execute(
            "UPDATE progreso SET titulo_actual = ? WHERE usuario_id = ?",
            (datos_nivel["titulo_desbloqueado"], current_user.id)
        )

    conexion.commit()
    conexion.close()

    return jsonify({
        "mensaje": "Nivel completado",
        "cm_total": cm_obtenido,
        "insignia": datos_nivel["insignia"],
        "titulo_desbloqueado": datos_nivel.get("titulo_desbloqueado")
    })

@app.route("/recompensa/<int:num_nivel>")
@login_required
def recompensa(num_nivel):
    niveles_data = cargar_niveles()
    datos_nivel = niveles_data["niveles"][num_nivel - 1]

    conexion = get_db()
    cursor = conexion.cursor()
    cursor.execute("SELECT * FROM progreso WHERE usuario_id = ?", (current_user.id,))
    progreso = dict(cursor.fetchone())

    cursor.execute(
        "SELECT cm_obtenido FROM niveles_completados WHERE usuario_id = ? AND nivel = ?",
        (current_user.id, num_nivel)
    )
    fila = cursor.fetchone()
    cm_nivel = fila["cm_obtenido"] if fila else 0

    conexion.close()

    # Calcular % de progreso
    cm_maximo = sum(n["cm_base"] + n["cm_bonus_tiempo"] for n in niveles_data["niveles"])
    porcentaje_progreso = int((progreso["cm_total"] / cm_maximo) * 100) if cm_maximo > 0 else 0

    return render_template(
        "recompensa.html",
        nivel=datos_nivel,
        progreso=progreso,
        cm_nivel=cm_nivel,
        cm_maximo=cm_maximo,
        porcentaje_progreso=porcentaje_progreso,
        nombre=current_user.nombre_usuario
    )

# ============================================================
# INICIALIZACIÓN (SE EJECUTA AL ARRANCAR, TAMBIÉN CON GUNICORN)
# ============================================================

inicializar_base_datos()

# ============================================================
# INICIO
# ============================================================

if __name__ == "__main__":
    print("🚀 Servidor iniciado en http://127.0.0.1:5000")
    app.run(debug=True, host='0.0.0.0', port=5000)