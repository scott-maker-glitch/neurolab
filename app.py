"""
Servidor Flask del juego de psicología.
Ejecutar con: python app.py
"""

from flask import Flask, render_template, request, redirect, url_for, jsonify, session
from flask_login import LoginManager, UserMixin, login_user, login_required, logout_user, current_user
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime, timedelta
from flask_sqlalchemy import SQLAlchemy
from dotenv import load_dotenv
import json
import os

# ============================================================
# CONFIGURACIÓN INICIAL
# ============================================================

# Cargar variables desde el archivo .env
load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env"))

app = Flask(__name__)
app.secret_key = os.environ.get("SECRET_KEY", "clave_por_defecto_solo_desarrollo")

# Configuración de la base de datos PostgreSQL (Aiven)
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get("DATABASE_URL")
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SQLALCHEMY_ENGINE_OPTIONS'] = {
    "pool_pre_ping": True,
    "pool_recycle": 300,
}

db = SQLAlchemy(app)

NIVELES_PATH = os.path.join("data", "niveles.json")
LECTURAS_PATH = os.path.join("data", "lecturas")

VIDAS_MAXIMAS = 5
TIEMPO_REGENERACION_SEGUNDOS = 60

login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = "login"

# ============================================================
# MODELOS DE BASE DE DATOS (SQLAlchemy)
# ============================================================

class Usuario(UserMixin, db.Model):
    __tablename__ = 'usuarios'
    id = db.Column(db.Integer, primary_key=True)
    nombre_usuario = db.Column(db.String(80), unique=True, nullable=False)
    contrasena_hash = db.Column(db.String(200), nullable=False)
    fecha_registro = db.Column(db.DateTime, default=datetime.utcnow)

    progreso = db.relationship('Progreso', backref='usuario', uselist=False, cascade="all, delete-orphan")


class Progreso(db.Model):
    __tablename__ = 'progreso'
    id = db.Column(db.Integer, primary_key=True)
    usuario_id = db.Column(db.Integer, db.ForeignKey('usuarios.id'), unique=True, nullable=False)
    nivel_actual = db.Column(db.Integer, default=1)
    cm_total = db.Column(db.Integer, default=0)
    titulo_actual = db.Column(db.String(50), default='Novato')
    vidas = db.Column(db.Integer, default=VIDAS_MAXIMAS)
    ultima_perdida_vida = db.Column(db.DateTime, nullable=True)
    fecha_actualizacion = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class NivelCompletado(db.Model):
    __tablename__ = 'niveles_completados'
    id = db.Column(db.Integer, primary_key=True)
    usuario_id = db.Column(db.Integer, db.ForeignKey('usuarios.id'), nullable=False)
    nivel = db.Column(db.Integer, nullable=False)
    cm_obtenido = db.Column(db.Integer, default=0)
    insignia = db.Column(db.String(50))
    fecha_completado = db.Column(db.DateTime, default=datetime.utcnow)

    __table_args__ = (db.UniqueConstraint('usuario_id', 'nivel', name='_usuario_nivel_uc'),)


# ============================================================
# CARGA DE USUARIO PARA FLASK-LOGIN
# ============================================================

@login_manager.user_loader
def load_user(user_id):
    return Usuario.query.get(int(user_id))


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
    """Devuelve el progreso del usuario como diccionario, regenerando vidas si corresponde."""
    progreso = Progreso.query.filter_by(usuario_id=usuario_id).first()

    if not progreso:
        return None

    segundos_para_vida = 0

    # Regeneración de vidas (1 minuto por vida, máximo 5)
    if progreso.vidas < VIDAS_MAXIMAS and progreso.ultima_perdida_vida:
        ultima = progreso.ultima_perdida_vida
        ahora = datetime.now()
        segundos_pasados = (ahora - ultima).total_seconds()
        vidas_recuperadas = int(segundos_pasados // TIEMPO_REGENERACION_SEGUNDOS)

        if vidas_recuperadas > 0:
            nuevas_vidas = min(VIDAS_MAXIMAS, progreso.vidas + vidas_recuperadas)

            if nuevas_vidas >= VIDAS_MAXIMAS:
                progreso.ultima_perdida_vida = None
            else:
                progreso.ultima_perdida_vida = ultima + timedelta(
                    seconds=vidas_recuperadas * TIEMPO_REGENERACION_SEGUNDOS
                )

            progreso.vidas = nuevas_vidas
            db.session.commit()
        else:
            segundos_restantes = TIEMPO_REGENERACION_SEGUNDOS - (segundos_pasados % TIEMPO_REGENERACION_SEGUNDOS)
            segundos_para_vida = int(segundos_restantes)

    # Devolvemos un diccionario para que los templates sigan funcionando igual
    return {
        "id": progreso.id,
        "usuario_id": progreso.usuario_id,
        "nivel_actual": progreso.nivel_actual,
        "cm_total": progreso.cm_total,
        "titulo_actual": progreso.titulo_actual,
        "vidas": progreso.vidas,
        "ultima_perdida_vida": progreso.ultima_perdida_vida,
        "fecha_actualizacion": progreso.fecha_actualizacion,
        "segundos_para_vida": segundos_para_vida,
    }


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

        # Verificar si ya existe
        usuario_existente = Usuario.query.filter_by(nombre_usuario=nombre).first()
        if usuario_existente:
            return render_template("registro.html", error="Ese nombre de usuario ya existe.")

        # Crear usuario
        hash_contrasena = generate_password_hash(contrasena)
        nuevo_usuario = Usuario(nombre_usuario=nombre, contrasena_hash=hash_contrasena)
        db.session.add(nuevo_usuario)
        db.session.commit()

        # Crear su progreso inicial
        nuevo_progreso = Progreso(
            usuario_id=nuevo_usuario.id,
            nivel_actual=1,
            cm_total=0,
            vidas=VIDAS_MAXIMAS,
            titulo_actual='Novato'
        )
        db.session.add(nuevo_progreso)
        db.session.commit()

        return redirect(url_for("login"))

    return render_template("registro.html")


@app.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        nombre = request.form.get("nombre", "").strip()
        contrasena = request.form.get("contrasena", "").strip()

        usuario = Usuario.query.filter_by(nombre_usuario=nombre).first()

        if usuario and check_password_hash(usuario.contrasena_hash, contrasena):
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

    total_niveles = len(niveles_data["niveles"])
    cm_maximo = sum(n["cm_base"] + n["cm_bonus_tiempo"] for n in niveles_data["niveles"])

    niveles_completados = max(0, progreso["nivel_actual"] - 1)
    porcentaje_progreso = int((niveles_completados / total_niveles) * 100) if total_niveles > 0 else 0

    return render_template(
        "menu.html",
        nombre=current_user.nombre_usuario,
        saludo=obtener_saludo(),
        progreso=progreso,
        total_niveles=total_niveles,
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
    progreso = Progreso.query.filter_by(usuario_id=current_user.id).first()

    if not progreso:
        return jsonify({"vidas": 0, "mensaje": "Sin progreso", "sin_vidas": True})

    if progreso.vidas > 0:
        progreso.vidas = progreso.vidas - 1
        progreso.ultima_perdida_vida = datetime.now()
        db.session.commit()

        return jsonify({
            "vidas": progreso.vidas,
            "mensaje": "Vida perdida",
            "sin_vidas": progreso.vidas <= 0
        })

    return jsonify({"vidas": 0, "mensaje": "Sin vidas disponibles", "sin_vidas": True})


@app.route("/api/completar_nivel", methods=["POST"])
@login_required
def completar_nivel():
    datos = request.get_json()
    num_nivel = datos.get("nivel")
    cm_obtenido = datos.get("cm", 0)

    print(f"[DEBUG] Completando nivel {num_nivel} con CM {cm_obtenido}")

    niveles_data = cargar_niveles()
    datos_nivel = niveles_data["niveles"][num_nivel - 1]

    ya_completado = NivelCompletado.query.filter_by(
        usuario_id=current_user.id, nivel=num_nivel
    ).first()

    if not ya_completado:
        nuevo_nivel = NivelCompletado(
            usuario_id=current_user.id,
            nivel=num_nivel,
            cm_obtenido=cm_obtenido,
            insignia=datos_nivel["insignia"]
        )
        db.session.add(nuevo_nivel)
        print(f"[DEBUG] Insertado nivel {num_nivel} con {cm_obtenido} CM")
    else:
        print(f"[DEBUG] Nivel {num_nivel} ya estaba completado, sumando CM igual")

    progreso = Progreso.query.filter_by(usuario_id=current_user.id).first()
    progreso.cm_total = progreso.cm_total + cm_obtenido
    progreso.nivel_actual = num_nivel + 1

    if datos_nivel.get("titulo_desbloqueado"):
        progreso.titulo_actual = datos_nivel["titulo_desbloqueado"]

    db.session.commit()

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

    progreso_obj = Progreso.query.filter_by(usuario_id=current_user.id).first()
    progreso = {
        "id": progreso_obj.id,
        "usuario_id": progreso_obj.usuario_id,
        "nivel_actual": progreso_obj.nivel_actual,
        "cm_total": progreso_obj.cm_total,
        "titulo_actual": progreso_obj.titulo_actual,
        "vidas": progreso_obj.vidas,
        "ultima_perdida_vida": progreso_obj.ultima_perdida_vida,
        "fecha_actualizacion": progreso_obj.fecha_actualizacion,
    }

    nivel_completado = NivelCompletado.query.filter_by(
        usuario_id=current_user.id, nivel=num_nivel
    ).first()
    cm_nivel = nivel_completado.cm_obtenido if nivel_completado else 0

    total_niveles = len(niveles_data["niveles"])
    niveles_completados = num_nivel
    porcentaje_progreso = int((niveles_completados / total_niveles) * 100) if total_niveles > 0 else 0

    cm_maximo = sum(n["cm_base"] + n["cm_bonus_tiempo"] for n in niveles_data["niveles"])

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
# INICIO
# ============================================================

if __name__ == "__main__":
    print("🚀 Servidor iniciado en http://127.0.0.1:5000")
    app.run(debug=True, host='0.0.0.0', port=5000)