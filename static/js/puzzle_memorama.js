/* ============================================================
   NEUROLAB - PUZZLE: MEMORAMA CONCEPTUAL
   ============================================================ */

class PuzzleMemorama {
    constructor(datosNivel, opciones) {
        this.nivel = datosNivel.nivel;
        this.pares = datosNivel.puzzle.pares;
        this.tiempoTotal = datosNivel.tiempo_segundos;
        this.cmBase = datosNivel.cm_base;
        this.cmBonus = datosNivel.cm_bonus_tiempo;
        this.tiempoRestante = datosNivel.tiempo_segundos;
        this.vidas = opciones.vidasIniciales;
        this.cmAcumulado = 0;
        this.paresEncontrados = 0;
        this.bloqueado = false;
        this.cartasVolteadas = [];
        this.temporizador = null;
        this.tiempoVolteo = null;

        this.inicializarUI();
    }

    // ============================================================
    // MEZCLAR CARTAS
    // ============================================================
    generarCartas() {
        const cartas = [];

        this.pares.forEach((par, indice) => {
            // Carta de término
            cartas.push({
                tipo: 'termino',
                contenido: par.termino,
                parId: indice,
                esTermino: true
            });
            // Carta de definición
            cartas.push({
                tipo: 'definicion',
                contenido: par.definicion,
                parId: indice,
                esTermino: false
            });
        });

        // Mezclar (Fisher-Yates)
        for (let i = cartas.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [cartas[i], cartas[j]] = [cartas[j], cartas[i]];
        }

        return cartas;
    }

    // ============================================================
    // UI
    // ============================================================
    inicializarUI() {
        const contenedor = document.getElementById('contenedor-puzzle');
        const cartas = this.generarCartas();

        contenedor.innerHTML = `
            <div class="puzzle-memorama">
                <div class="puzzle-header">
                    <span class="puzzle-progreso">Pares: ${this.paresEncontrados} / ${this.pares.length}</span>
                    <span class="puzzle-cm" id="cm-acumulado">+${this.cmAcumulado} CM</span>
                </div>

                <div class="barra-progreso-puzzle">
                    <div class="barra-relleno" id="barra-puzzle"></div>
                </div>

                <div class="memorama-grid" id="memorama-grid">
                    ${cartas.map((carta, i) => `
                        <div class="carta-memorama" data-indice="${i}" data-par-id="${carta.parId}" data-es-termino="${carta.esTermino}">
                            <div class="carta-inner">
                                <div class="carta-cara carta-atras">?</div>
                                <div class="carta-cara carta-frente ${carta.esTermino ? 'es-termino' : 'es-definicion'}">
                                    ${carta.contenido}
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;

        this.cartasElementos = document.querySelectorAll('.carta-memorama');
        this.cartasElementos.forEach(carta => {
            carta.addEventListener('click', () => this.voltearCarta(carta));
        });

        this.iniciarTemporizador();
    }

    // ============================================================
    // LÓGICA DE VOLTEO
    // ============================================================
    voltearCarta(carta) {
        if (this.bloqueado) return;
        if (carta.classList.contains('volteada')) return;
        if (carta.classList.contains('encontrada')) return;

        carta.classList.add('volteada');
        this.cartasVolteadas.push(carta);

        if (this.cartasVolteadas.length === 2) {
            this.verificarPar();
        }
    }

    verificarPar() {
        this.bloqueado = true;
        const [carta1, carta2] = this.cartasVolteadas;

        const parId1 = parseInt(carta1.dataset.parId);
        const parId2 = parseInt(carta2.dataset.parId);
        const tipo1 = carta1.dataset.esTermino === 'true';
        const tipo2 = carta2.dataset.esTermino === 'true';

        // Es correcto si: mismo parId Y uno es término y el otro definición
        const esCorrecto = (parId1 === parId2) && (tipo1 !== tipo2);

        if (esCorrecto) {
            this.acierto(carta1, carta2);
        } else {
            this.fallo(carta1, carta2);
        }
    }

    acierto(carta1, carta2) {
        setTimeout(() => {
            carta1.classList.add('encontrada');
            carta2.classList.add('encontrada');

            this.paresEncontrados++;

            // Sumar CM
            const cmPar = Math.floor(this.cmBase / this.pares.length);
            this.cmAcumulado += cmPar;
            document.getElementById('cm-acumulado').textContent = `+${this.cmAcumulado} CM`;

            // Actualizar progreso
            document.querySelector('.puzzle-progreso').textContent = `Pares: ${this.paresEncontrados} / ${this.pares.length}`;
            this.actualizarBarra();

            // Limpiar selección
            this.cartasVolteadas = [];
            this.bloqueado = false;

            if (this.paresEncontrados >= this.pares.length) {
                setTimeout(() => this.completarNivel(), 800);
            }
        }, 600);
    }

    async fallo(carta1, carta2) {
        // Si son 2 términos o 2 definiciones del mismo par → error
        // Si son de distinto par → error
        const [carta1El, carta2El] = [carta1, carta2];

        setTimeout(async () => {
            carta1El.classList.add('incorrecta');
            carta2El.classList.add('incorrecta');

            try {
                const respuesta = await fetch('/api/perder_vida', { method: 'POST' });
                const datos = await respuesta.json();
                this.vidas = datos.vidas;
                this.actualizarVidasUI();

                if (this.vidas <= 0) {
                    setTimeout(() => this.derrota('Te quedaste sin vidas'), 500);
                    return;
                }
            } catch (error) {
                console.error('Error perdiendo vida:', error);
            }

            setTimeout(() => {
                carta1El.classList.remove('volteada', 'incorrecta');
                carta2El.classList.remove('volteada', 'incorrecta');
                this.cartasVolteadas = [];
                this.bloqueado = false;
            }, 1000);
        }, 400);
    }

    actualizarVidasUI() {
        const vidas = document.querySelectorAll('#vidas-puzzle .vida');
        vidas.forEach((vida, i) => {
            if (i >= this.vidas) vida.classList.add('perdida');
        });
    }

    actualizarBarra() {
        const porcentaje = (this.paresEncontrados / this.pares.length) * 100;
        const barra = document.getElementById('barra-puzzle');
        if (barra) barra.style.width = `${porcentaje}%`;
    }

    iniciarTemporizador() {
        const elementoTiempo = document.getElementById('tiempo-restante');
        const elementoTemporizador = document.getElementById('temporizador');

        this.temporizador = setInterval(() => {
            this.tiempoRestante--;
            if (elementoTiempo) elementoTiempo.textContent = this.tiempoRestante;

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
                body: JSON.stringify({ nivel: this.nivel, cm: cmTotal })
            });
            window.location.href = `/recompensa/${this.nivel}`;
        } catch (error) {
            console.error('Error completando nivel:', error);
        }
    }

    derrota(motivo) {
        clearInterval(this.temporizador);
        const contenedor = document.getElementById('contenedor-puzzle');
        if (contenedor) {
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
}

// Inicializar
document.addEventListener('DOMContentLoaded', () => {
    if (window.DATOS_NIVEL && window.DATOS_NIVEL.tipo_puzzle === 'memorama_conceptual') {
        new PuzzleMemorama(window.DATOS_NIVEL, {
            vidasIniciales: window.VIDAS_INICIALES
        });
    }
});