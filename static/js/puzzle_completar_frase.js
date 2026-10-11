/* ============================================================
   NEUROLAB - PUZZLE: COMPLETAR FRASE
   ============================================================ */

class PuzzleCompletarFrase {
    constructor(datosNivel, opciones) {
        this.nivel = datosNivel.nivel;
        this.frases = datosNivel.puzzle.frases;
        this.tiempoTotal = datosNivel.tiempo_segundos;
        this.cmBase = datosNivel.cm_base;
        this.cmBonus = datosNivel.cm_bonus_tiempo;
        this.vidasIniciales = opciones.vidasIniciales;
        this.tiempoRestante = datosNivel.tiempo_segundos;
        this.indiceActual = 0;
        this.vidas = opciones.vidasIniciales;
        this.cmAcumulado = 0;
        this.errores = 0;
        this.intentosFallidos = 0;
        this.bloqueado = false;

        this.inicializarUI();
    }

    inicializarUI() {
        const contenedor = document.getElementById('contenedor-puzzle');
        contenedor.innerHTML = `
            <div class="puzzle-completar">
                <div class="puzzle-header">
                    <span class="puzzle-progreso" id="progreso-frase">Frase ${this.indiceActual + 1} / ${this.frases.length}</span>
                    <span class="puzzle-intentos" id="intentos-fallidos">Fallos: 0 / 2</span>
                    <span class="puzzle-cm" id="cm-acumulado">+${this.cmAcumulado} CM</span>
                </div>

                <div class="barra-progreso-puzzle">
                    <div class="barra-relleno" id="barra-puzzle"></div>
                </div>

                <div class="puzzle-contenido" id="puzzle-contenido"></div>
            </div>
        `;

        this.renderizarFrase();
        this.actualizarBarra();
        // ⏱️ El temporizador se inicia desde nivel.html cuando el jugador hace clic en "Continuar al puzzle"
        // this.iniciarTemporizador();
    }

    renderizarFrase() {
        const frase = this.frases[this.indiceActual];
        const contenedor = document.getElementById('puzzle-contenido');
        const partes = frase.texto.split('___');

        contenedor.innerHTML = `
            <div class="frase-puzzle">
                <p class="frase-texto">
                    ${partes[0]}<span class="espacio-blanco" id="espacio-blanco">___</span>${partes[1] || ''}
                </p>
            </div>

            <div class="opciones-puzzle" id="opciones-puzzle">
                ${(frase.opciones || []).map((opcion, i) => `
                    <button class="opcion" data-opcion="${opcion}" data-indice="${i}">
                        ${opcion}
                    </button>
                `).join('')}
            </div>
        `;

        document.querySelectorAll('.opcion').forEach(btn => {
            btn.addEventListener('click', (e) => this.validarRespuesta(e.target));
        });
    }

    async validarRespuesta(boton) {
        if (this.bloqueado) return;
        this.bloqueado = true;

        const respuesta = boton.dataset.opcion;
        const frase = this.frases[this.indiceActual];

        try {
            const respuestaBackend = await fetch('/api/validar_respuesta', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    nivel: this.nivel,
                    indice: this.indiceActual,
                    respuesta: respuesta
                })
            });

            const resultado = await respuestaBackend.json();

            if (resultado.correcto) {
                this.acierto(boton, frase.respuesta);
            } else {
                this.fallo(boton, resultado.respuesta_correcta);
            }
        } catch (error) {
            console.error('Error validando:', error);
            this.bloqueado = false;
        }
    }

    acierto(boton, respuestaCorrecta) {
        boton.classList.add('correcto');

        const espacio = document.getElementById('espacio-blanco');
        espacio.textContent = respuestaCorrecta;
        espacio.classList.add('rellenado');

        const cmFrase = Math.floor(this.cmBase / this.frases.length);
        this.cmAcumulado += cmFrase;
        document.getElementById('cm-acumulado').textContent = `+${this.cmAcumulado} CM`;

        setTimeout(() => {
            this.indiceActual++;
            if (this.indiceActual >= this.frases.length) {
                this.completarNivel();
            } else {
                this.bloqueado = false;
                this.renderizarFrase();
                this.actualizarBarra();

                // ⬇️ ACTUALIZAR EL TEXTO "FRASE X / Y"
                const progresoEl = document.getElementById('progreso-frase');
                if (progresoEl) {
                    progresoEl.textContent = `Frase ${this.indiceActual + 1} / ${this.frases.length}`;
                }
            }
        }, 1200);
    }

    async fallo(boton, respuestaCorrecta) {
        boton.classList.add('incorrecto');
        this.errores++;

        // Sumar intento fallido
        this.intentosFallidos++;

        // Actualizar contador en pantalla
        const intentosEl = document.getElementById('intentos-fallidos');
        if (intentosEl) intentosEl.textContent = `Fallos: ${this.intentosFallidos} / 2`;

        // Cada 2 fallos, pierde 1 vida
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

        const espacio = document.getElementById('espacio-blanco');
        espacio.textContent = respuestaCorrecta;
        espacio.classList.add('revelado');

        setTimeout(() => {
            boton.classList.remove('incorrecto');
            espacio.textContent = '___';
            espacio.classList.remove('revelado');
            this.bloqueado = false;
        }, 1500);
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
        const porcentaje = ((this.indiceActual) / this.frases.length) * 100;
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

        console.log(`[DEBUG] Enviando al backend: nivel=${this.nivel}, cm=${cmTotal} (acumulado=${this.cmAcumulado}, bonus=${bonus})`);

        try {
            const respuesta = await fetch('/api/completar_nivel', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    nivel: this.nivel,
                    cm: cmTotal
                })
            });

            const resultado = await respuesta.json();
            console.log('[DEBUG] Respuesta del backend:', resultado);

            window.location.href = `/recompensa/${this.nivel}`;
        } catch (error) {
            console.error('Error completando nivel:', error);
            setTimeout(() => {
                window.location.href = `/recompensa/${this.nivel}`;
            }, 500);
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
    if (window.DATOS_NIVEL && window.DATOS_NIVEL.tipo_puzzle === 'completar_frase') {
        window.puzzleInstance = new PuzzleCompletarFrase(window.DATOS_NIVEL, {
            vidasIniciales: window.VIDAS_INICIALES
        });
    }
});