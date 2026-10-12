/* ============================================================
   NEUROLAB - PUZZLE: VERDADERO / FALSO
   ============================================================ */

class PuzzleVerdaderoFalso {
    constructor(datosNivel, opciones) {
        this.nivel = datosNivel.nivel;
        this.afirmaciones = datosNivel.puzzle.afirmaciones;
        this.tiempoTotal = datosNivel.tiempo_segundos;
        this.cmBase = datosNivel.cm_base;
        this.cmBonus = datosNivel.cm_bonus_tiempo;
        this.tiempoRestante = datosNivel.tiempo_segundos;
        this.indiceActual = 0;
        this.vidas = opciones.vidasIniciales;
        this.cmAcumulado = 0;
        this.bloqueado = false;
        this.temporizador = null;

        this.usarIntentos = (this.nivel === 4);
        this.intentosFallidos = 0;

        this.inicializarUI();
    }

    inicializarUI() {
        const contenedor = document.getElementById('contenedor-puzzle');
        contenedor.innerHTML = `
            <div class="puzzle-vf">
                <div class="puzzle-header">
                    <span class="puzzle-progreso" id="progreso-afirmacion">Afirmación ${this.indiceActual + 1} / ${this.afirmaciones.length}</span>
                    ${this.usarIntentos ? '<span class="puzzle-intentos" id="intentos-fallidos">Fallos: 0 / 2</span>' : ''}
                    <span class="puzzle-cm" id="cm-acumulado">+${this.cmAcumulado} CM</span>
                </div>

                <div class="barra-progreso-puzzle">
                    <div class="barra-relleno" id="barra-puzzle"></div>
                </div>

                <div class="puzzle-contenido" id="puzzle-contenido"></div>
            </div>
        `;

        this.renderizarAfirmacion();
        this.actualizarBarra();
    }

    renderizarAfirmacion() {
        const afirmacion = this.afirmaciones[this.indiceActual];
        const contenedor = document.getElementById('puzzle-contenido');

        contenedor.innerHTML = `
            <div class="vf-afirmacion">
                <div class="vf-icono">🤔</div>
                <p class="vf-texto">${afirmacion.texto}</p>
            </div>

            <div class="vf-botones">
                <button class="vf-boton vf-verdadero" data-respuesta="true">
                    <span class="vf-boton-icono">✅</span>
                    <span class="vf-boton-texto">Verdadero</span>
                </button>
                <button class="vf-boton vf-falso" data-respuesta="false">
                    <span class="vf-boton-icono">❌</span>
                    <span class="vf-boton-texto">Falso</span>
                </button>
            </div>
        `;

        document.querySelectorAll('.vf-boton').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const boton = e.currentTarget;
                this.validarRespuesta(boton, boton.dataset.respuesta === 'true');
            });
        });
    }

    async validarRespuesta(boton, respuestaUsuario) {
        if (this.bloqueado) return;
        this.bloqueado = true;

        const afirmacion = this.afirmaciones[this.indiceActual];

        try {
            const respuestaBackend = await fetch('/api/validar_respuesta', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    nivel: this.nivel,
                    indice: this.indiceActual,
                    respuesta: respuestaUsuario.toString()
                })
            });

            const resultado = await respuestaBackend.json();

            if (resultado.correcto) {
                this.acierto(boton);
            } else {
                this.fallo(boton, afirmacion.respuesta);
            }
        } catch (error) {
            console.error('Error validando:', error);
            this.bloqueado = false;
        }
    }

    acierto(boton) {
        boton.classList.add('correcto');

        const cmFrase = Math.floor(this.cmBase / this.afirmaciones.length);
        this.cmAcumulado += cmFrase;
        document.getElementById('cm-acumulado').textContent = `+${this.cmAcumulado} CM`;

        setTimeout(() => {
            this.indiceActual++;
            if (this.indiceActual >= this.afirmaciones.length) {
                this.completarNivel();
            } else {
                this.bloqueado = false;
                this.renderizarAfirmacion();
                this.actualizarBarra();

                const progresoEl = document.getElementById('progreso-afirmacion');
                if (progresoEl) {
                    progresoEl.textContent = `Afirmación ${this.indiceActual + 1} / ${this.afirmaciones.length}`;
                }
            }
        }, 1200);
    }

    async fallo(boton, respuestaCorrecta) {
        boton.classList.add('incorrecto');

        if (this.usarIntentos) {
            this.intentosFallidos++;
            const intentosEl = document.getElementById('intentos-fallidos');
            if (intentosEl) intentosEl.textContent = `Fallos: ${this.intentosFallidos} / 2`;

            if (this.intentosFallidos >= 2) {
                this.intentosFallidos = 0;
                if (intentosEl) intentosEl.textContent = `Fallos: 0 / 2`;

                try {
                    const respuesta = await fetch('/api/perder_vida', { method: 'POST' });
                    const datos = await respuesta.json();
                    this.vidas = datos.vidas;
                    this.actualizarVidasUI();

                    if (this.vidas <= 0) {
                        setTimeout(() => this.derrota('Te quedaste sin vidas'), 1000);
                        return;
                    }
                } catch (error) {
                    console.error('Error perdiendo vida:', error);
                }
            }
        } else {
            try {
                const respuesta = await fetch('/api/perder_vida', { method: 'POST' });
                const datos = await respuesta.json();
                this.vidas = datos.vidas;
                this.actualizarVidasUI();

                if (this.vidas <= 0) {
                    setTimeout(() => this.derrota('Te quedaste sin vidas'), 1000);
                    return;
                }
            } catch (error) {
                console.error('Error perdiendo vida:', error);
            }
        }

        setTimeout(() => {
            boton.classList.remove('incorrecto');
            const botonCorrecto = document.querySelector(`.vf-boton[data-respuesta="${respuestaCorrecta}"]`);
            if (botonCorrecto) {
                botonCorrecto.classList.add('revelado');
                setTimeout(() => {
                    botonCorrecto.classList.remove('revelado');
                    this.bloqueado = false;
                }, 1200);
            } else {
                this.bloqueado = false;
            }
        }, 800);
    }

    actualizarVidasUI() {
        const vidas = document.querySelectorAll('#vidas-puzzle .vida');
        vidas.forEach((vida, i) => {
            if (i >= this.vidas) {
                vida.classList.add('perdida');
            }
        });
    }

    actualizarBarra() {
        const porcentaje = (this.indiceActual / this.afirmaciones.length) * 100;
        const barra = document.getElementById('barra-puzzle');
        if (barra) barra.style.width = `${porcentaje}%`;
    }

    iniciarTemporizador() {
        const elementoTiempo = document.getElementById('tiempo-restante');
        const elementoTemporizador = document.getElementById('temporizador');

        this.temporizador = setInterval(() => {
            this.tiempoRestante--;

            if (elementoTiempo) {
                elementoTiempo.textContent = this.tiempoRestante;
            }

            if (elementoTemporizador) {
                if (this.tiempoRestante <= 30) {
                    elementoTemporizador.classList.add('peligro');
                    elementoTemporizador.classList.remove('advertencia');
                } else if (this.tiempoRestante <= 60) {
                    elementoTemporizador.classList.add('advertencia');
                }
            }

            if (this.tiempoRestante <= 0) {
                clearInterval(this.temporizador);
                this.derrota('Se acabó el tiempo');
            }
        }, 1000);
    }

    async completarNivel() {
        clearInterval(this.temporizador);

        const bonus = Math.floor((this.tiempoRestante / this.tiempoTotal) * this.cmBonus);
        const cmTotal = this.cmAcumulado + bonus;

        try {
            await fetch('/api/completar_nivel', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    nivel: this.nivel,
                    cm: cmTotal
                })
            });
            window.mostrarModalCompletado();
        } catch (error) {
            console.error('Error completando nivel:', error);
            window.mostrarModalCompletado();
        }
    }

    derrota(motivo) {
        clearInterval(this.temporizador);
        this.bloqueado = true;

        const contenedor = document.getElementById('puzzle-contenido');
        contenedor.innerHTML = `
            <div class="puzzle-derrota">
                <div class="derrota-icono">💔</div>
                <h2>¡Oh no!</h2>
                <p>${motivo}</p>
                <p class="derrota-info">Vidas restantes: ${this.vidas}</p>
                <a href="/menu" class="boton">Volver al menú</a>
            </div>
        `;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    if (window.DATOS_NIVEL && window.DATOS_NIVEL.tipo_puzzle === 'verdadero_falso') {
        window.puzzleInstance = new PuzzleVerdaderoFalso(window.DATOS_NIVEL, {
            vidasIniciales: window.VIDAS_INICIALES
        });
    }
});