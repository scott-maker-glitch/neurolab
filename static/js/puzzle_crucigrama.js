/* ============================================================
   NEUROLAB - PUZZLE: CRUCIGRAMA (v5 - verificación automática)
   ============================================================ */

class PuzzleCrucigrama {
    constructor(datosNivel, opciones) {
        this.nivel = datosNivel.nivel;
        this.palabras = datosNivel.puzzle.palabras;
        this.gridAncho = datosNivel.puzzle.grid_ancho;
        this.gridAlto = datosNivel.puzzle.grid_alto;
        this.tiempoTotal = datosNivel.tiempo_segundos;
        this.cmBase = datosNivel.cm_base;
        this.cmBonus = datosNivel.cm_bonus_tiempo;
        this.tiempoRestante = datosNivel.tiempo_segundos;
        this.vidas = opciones.vidasIniciales;
        this.cmAcumulado = 0;
        this.palabrasResueltas = new Set();
        this.temporizador = null;

        // Nuevo: contador de errores
        this.erroresConsecutivos = 0;
        this.ERRORES_POR_VIDA = 3;

        this.grid = [];
        this.celdas = {};
        this.celdaActiva = null;
        this.direccionActiva = 'horizontal';

        this.construirGrid();
        this.inicializarUI();
    }

    construirGrid() {
        for (let f = 0; f < this.gridAlto; f++) {
            this.grid[f] = [];
            for (let c = 0; c < this.gridAncho; c++) {
                this.grid[f][c] = { tipo: 'negra', letra: '', palabras: [] };
            }
        }

        this.palabras.forEach(palabra => {
            const letras = palabra.palabra;
            for (let i = 0; i < letras.length; i++) {
                let f = palabra.fila;
                let c = palabra.col;

                if (palabra.direccion === 'horizontal') {
                    c += i;
                } else {
                    f += i;
                }

                if (f < 0 || f >= this.gridAlto || c < 0 || c >= this.gridAncho) {
                    console.warn(`Palabra "${palabra.palabra}" fuera del grid en (${f},${c})`);
                    continue;
                }

                this.grid[f][c].tipo = 'blanca';
                this.grid[f][c].palabras.push(palabra.numero);

                const key = `${f},${c}`;
                if (!this.celdas[key]) {
                    this.celdas[key] = {
                        fila: f,
                        col: c,
                        letraCorrecta: letras[i],
                        palabraIds: []
                    };
                }
                this.celdas[key].palabraIds.push(palabra.numero);
            }
        });
    }

    inicializarUI() {
        const contenedor = document.getElementById('contenedor-puzzle');
        const horizontales = this.palabras.filter(p => p.direccion === 'horizontal');
        const verticales = this.palabras.filter(p => p.direccion === 'vertical');

        contenedor.innerHTML = `
            <div class="puzzle-crucigrama">
                <!-- Leyenda de reglas -->
                <div class="crucigrama-aviso">
                    ⚠️ <strong>Recuerda:</strong> por cada 3 palabras erróneas pierdes una vida.
                </div>

                <div class="puzzle-header">
                    <span class="puzzle-progreso" id="progreso-palabras">Palabras: ${this.palabrasResueltas.size} / ${this.palabras.length}</span>
                    <span class="puzzle-errores" id="contador-errores">Errores: 0 / ${this.ERRORES_POR_VIDA}</span>
                    <span class="puzzle-cm" id="cm-acumulado">+${this.cmAcumulado} CM</span>
                </div>

                <div class="barra-progreso-puzzle">
                    <div class="barra-relleno" id="barra-puzzle"></div>
                </div>

                <div class="crucigrama-layout">
                    <div class="crucigrama-grid" id="crucigrama-grid" style="grid-template-columns: repeat(${this.gridAncho}, 1fr);">
                        ${this.renderizarCeldas()}
                    </div>

                    <div class="crucigrama-pistas">
                        <div class="pistas-seccion">
                            <h3>Horizontales →</h3>
                            <ul>
                                ${horizontales.map(p => `
                                    <li class="pista-item" data-palabra="${p.numero}">
                                        <strong>${p.numero}.</strong> ${p.pista} <em>(${p.palabra.length} letras)</em>
                                    </li>
                                `).join('')}
                            </ul>
                        </div>
                        <div class="pistas-seccion">
                            <h3>Verticales ↓</h3>
                            <ul>
                                ${verticales.map(p => `
                                    <li class="pista-item" data-palabra="${p.numero}">
                                        <strong>${p.numero}.</strong> ${p.pista} <em>(${p.palabra.length} letras)</em>
                                    </li>
                                `).join('')}
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.configurarEventos();
        // ⏱️ El temporizador se inicia desde nivel.html cuando el jugador hace clic en "Continuar al puzzle"
        // this.iniciarTemporizador();
    }

    renderizarCeldas() {
        let html = '';

        for (let f = 0; f < this.gridAlto; f++) {
            for (let c = 0; c < this.gridAncho; c++) {
                const celda = this.grid[f][c];

                if (celda.tipo === 'negra') {
                    html += `<div class="celda-crucigrama negra"></div>`;
                } else {
                    const palabraEmpiezaAqui = this.palabras.find(p => p.fila === f && p.col === c);
                    const numero = palabraEmpiezaAqui ? palabraEmpiezaAqui.numero : '';

                    html += `
                        <div class="celda-crucigrama blanca" data-fila="${f}" data-col="${c}">
                            ${numero ? `<span class="celda-numero">${numero}</span>` : ''}
                            <input type="text" maxlength="1" class="celda-input" data-fila="${f}" data-col="${c}" autocomplete="off" inputmode="text">
                        </div>
                    `;
                }
            }
        }

        return html;
    }

    configurarEventos() {
        document.querySelectorAll('.celda-input').forEach(input => {
            input.addEventListener('input', (e) => this.alEscribir(e.target));
            input.addEventListener('keydown', (e) => this.alPresionarTecla(e));
            input.addEventListener('focus', (e) => this.alEnfocar(e.target));
            input.addEventListener('click', (e) => this.alEnfocar(e.target));
        });

        document.querySelectorAll('.pista-item').forEach(pista => {
            pista.addEventListener('click', () => {
                const numPalabra = parseInt(pista.dataset.palabra);
                this.activarPalabra(numPalabra);
            });
        });
    }

    alEscribir(input) {
        const valor = input.value.toUpperCase();
        const soloLetras = valor.replace(/[^A-ZÁÉÍÓÚÑ]/g, '');
        input.value = soloLetras.slice(-1);

        if (input.value) {
            this.verificarPalabraActual(input);
            this.moverSiguiente(input);
        }
    }

    alPresionarTecla(e) {
        const input = e.target;

        if (e.key === 'ArrowRight') {
            e.preventDefault();
            this.direccionActiva = 'horizontal';
            this.moverAlSiguienteHorizontal(input);
        } else if (e.key === 'ArrowLeft') {
            e.preventDefault();
            this.direccionActiva = 'horizontal';
            this.moverAlAnteriorHorizontal(input);
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            this.direccionActiva = 'vertical';
            this.moverAlSiguienteVertical(input);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            this.direccionActiva = 'vertical';
            this.moverAlAnteriorVertical(input);
        } else if (e.key === 'Backspace') {
            if (input.value) {
                input.value = '';
                e.preventDefault();
                this.verificarPalabraActual(input);
            } else {
                e.preventDefault();
                this.moverAnterior(input);
                setTimeout(() => {
                    if (document.activeElement && document.activeElement.classList.contains('celda-input')) {
                        document.activeElement.value = '';
                        this.verificarPalabraActual(document.activeElement);
                    }
                }, 10);
            }
        } else if (e.key === 'Delete') {
            input.value = '';
            this.verificarPalabraActual(input);
        } else if (e.key === 'Tab') {
            e.preventDefault();
            this.moverSiguiente(input);
        }
    }

    alEnfocar(input) {
        const fila = parseInt(input.dataset.fila);
        const col = parseInt(input.dataset.col);

        const palabraHorizontal = this.palabras.find(p =>
            p.direccion === 'horizontal' &&
            p.fila === fila &&
            col >= p.col &&
            col < p.col + p.palabra.length
        );

        if (palabraHorizontal) {
            this.direccionActiva = 'horizontal';
        } else {
            this.direccionActiva = 'vertical';
        }

        this.celdaActiva = { fila, col };
        this.resaltarPalabraActiva(fila, col);
    }

    resaltarPalabraActiva(fila, col) {
        document.querySelectorAll('.celda-crucigrama.activa').forEach(el => el.classList.remove('activa'));
        document.querySelectorAll('.pista-item.activa').forEach(el => el.classList.remove('activa'));

        const palabra = this.palabras.find(p => {
            if (p.direccion !== this.direccionActiva) return false;

            if (this.direccionActiva === 'horizontal') {
                return p.fila === fila && col >= p.col && col < p.col + p.palabra.length;
            } else {
                return p.col === col && fila >= p.fila && fila < p.fila + p.palabra.length;
            }
        });

        if (!palabra) return;

        for (let i = 0; i < palabra.palabra.length; i++) {
            let f = palabra.fila;
            let c = palabra.col;
            if (palabra.direccion === 'horizontal') c += i;
            else f += i;

            const celda = document.querySelector(`.celda-crucigrama[data-fila="${f}"][data-col="${c}"]`);
            if (celda) celda.classList.add('activa');
        }

        const pista = document.querySelector(`.pista-item[data-palabra="${palabra.numero}"]`);
        if (pista) pista.classList.add('activa');
    }

    activarPalabra(numPalabra) {
        const palabra = this.palabras.find(p => p.numero === numPalabra);
        if (!palabra) return;

        this.direccionActiva = palabra.direccion;

        const input = document.querySelector(`.celda-input[data-fila="${palabra.fila}"][data-col="${palabra.col}"]`);
        if (input) input.focus();
    }

    // ============================================================
    // NAVEGACIÓN
    // ============================================================
    moverSiguiente(input) {
        if (this.direccionActiva === 'horizontal') {
            this.moverAlSiguienteHorizontal(input);
        } else {
            this.moverAlSiguienteVertical(input);
        }
    }

    moverAlSiguienteHorizontal(input) {
        const fila = parseInt(input.dataset.fila);
        const col = parseInt(input.dataset.col);

        for (let c = col + 1; c < this.gridAncho; c++) {
            const siguiente = document.querySelector(`.celda-input[data-fila="${fila}"][data-col="${c}"]`);
            if (siguiente) {
                siguiente.focus();
                return;
            }
        }
    }

    moverAlAnteriorHorizontal(input) {
        const fila = parseInt(input.dataset.fila);
        const col = parseInt(input.dataset.col);

        for (let c = col - 1; c >= 0; c--) {
            const anterior = document.querySelector(`.celda-input[data-fila="${fila}"][data-col="${c}"]`);
            if (anterior) {
                anterior.focus();
                return;
            }
        }
    }

    moverAlSiguienteVertical(input) {
        const fila = parseInt(input.dataset.fila);
        const col = parseInt(input.dataset.col);

        for (let f = fila + 1; f < this.gridAlto; f++) {
            const siguiente = document.querySelector(`.celda-input[data-fila="${f}"][data-col="${col}"]`);
            if (siguiente) {
                siguiente.focus();
                return;
            }
        }
    }

    moverAlAnteriorVertical(input) {
        const fila = parseInt(input.dataset.fila);
        const col = parseInt(input.dataset.col);

        for (let f = fila - 1; f >= 0; f--) {
            const anterior = document.querySelector(`.celda-input[data-fila="${f}"][data-col="${col}"]`);
            if (anterior) {
                anterior.focus();
                return;
            }
        }
    }

    moverAnterior(input) {
        if (this.direccionActiva === 'horizontal') {
            this.moverAlAnteriorHorizontal(input);
        } else {
            this.moverAlAnteriorVertical(input);
        }
    }

    // ============================================================
    // VERIFICACIÓN AUTOMÁTICA
    // ============================================================
    verificarPalabraActual(input) {
        const fila = parseInt(input.dataset.fila);
        const col = parseInt(input.dataset.col);

        const palabrasEnCelda = this.palabras.filter(p => {
            if (p.direccion === 'horizontal') {
                return p.fila === fila && col >= p.col && col < p.col + p.palabra.length;
            } else {
                return p.col === col && fila >= p.fila && fila < p.fila + p.palabra.length;
            }
        });

        palabrasEnCelda.forEach(palabra => this.verificarPalabra(palabra));
    }

    verificarPalabra(palabra) {
        const yaResuelta = this.palabrasResueltas.has(palabra.numero);

        // Construir la palabra actual
        let palabraActual = '';
        let celdasLlenas = 0;
        for (let i = 0; i < palabra.palabra.length; i++) {
            let f = palabra.fila;
            let c = palabra.col;
            if (palabra.direccion === 'horizontal') c += i;
            else f += i;

            const input = document.querySelector(`.celda-input[data-fila="${f}"][data-col="${c}"]`);
            if (input) {
                palabraActual += input.value.toUpperCase();
                if (input.value) celdasLlenas++;
            }
        }

        // Solo verificar cuando esté COMPLETA
        if (celdasLlenas === palabra.palabra.length) {
            if (palabraActual === palabra.palabra) {
                // ✅ Correcta
                if (!yaResuelta) {
                    this.marcarPalabraResuelta(palabra);
                }
            } else {
                // ❌ Incorrecta
                if (!yaResuelta) {
                    this.registrarError(palabra);
                }
            }
        } else if (yaResuelta) {
            // Si ya estaba resuelta pero se borró alguna letra, desmarcar
            this.desmarcarPalabra(palabra);
        }
    }

    async registrarError(palabra) {
        // Marcar la palabra como incorrecta visualmente
        this.marcarPalabraIncorrecta(palabra);

        // Sumar 1 al contador de errores
        this.erroresConsecutivos++;

        // Actualizar contador en pantalla
        const contadorEl = document.getElementById('contador-errores');
        if (contadorEl) {
            contadorEl.textContent = `Errores: ${this.erroresConsecutivos} / ${this.ERRORES_POR_VIDA}`;
        }

        // Si llega a 3 errores, pierde 1 vida
        if (this.erroresConsecutivos >= this.ERRORES_POR_VIDA) {
            this.erroresConsecutivos = 0;
            if (contadorEl) {
                contadorEl.textContent = `Errores: 0 / ${this.ERRORES_POR_VIDA}`;
            }

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

        // Borrar la palabra después de un delay para que el jugador pueda reintentar
        setTimeout(() => {
            for (let i = 0; i < palabra.palabra.length; i++) {
                let f = palabra.fila;
                let c = palabra.col;
                if (palabra.direccion === 'horizontal') c += i;
                else f += i;

                const input = document.querySelector(`.celda-input[data-fila="${f}"][data-col="${c}"]`);
                if (input) {
                    input.value = '';
                }
            }
        }, 1000);
    }

    marcarPalabraResuelta(palabra) {
        this.palabrasResueltas.add(palabra.numero);

        for (let i = 0; i < palabra.palabra.length; i++) {
            let f = palabra.fila;
            let c = palabra.col;
            if (palabra.direccion === 'horizontal') c += i;
            else f += i;

            const celda = document.querySelector(`.celda-crucigrama[data-fila="${f}"][data-col="${c}"]`);
            if (celda) celda.classList.add('resuelta');
        }

        const pista = document.querySelector(`.pista-item[data-palabra="${palabra.numero}"]`);
        if (pista) pista.classList.add('resuelta');

        const cmPalabra = Math.floor(this.cmBase / this.palabras.length);
        this.cmAcumulado += cmPalabra;
        document.getElementById('cm-acumulado').textContent = `+${this.cmAcumulado} CM`;

        const progresoEl = document.getElementById('progreso-palabras');
        if (progresoEl) {
            progresoEl.textContent = `Palabras: ${this.palabrasResueltas.size} / ${this.palabras.length}`;
        }
        this.actualizarBarra();

        if (this.palabrasResueltas.size >= this.palabras.length) {
            setTimeout(() => this.completarNivel(), 800);
        }
    }

    desmarcarPalabra(palabra) {
        this.palabrasResueltas.delete(palabra.numero);

        for (let i = 0; i < palabra.palabra.length; i++) {
            let f = palabra.fila;
            let c = palabra.col;
            if (palabra.direccion === 'horizontal') c += i;
            else f += i;

            const celda = document.querySelector(`.celda-crucigrama[data-fila="${f}"][data-col="${c}"]`);
            if (celda) celda.classList.remove('resuelta');
        }

        const pista = document.querySelector(`.pista-item[data-palabra="${palabra.numero}"]`);
        if (pista) pista.classList.remove('resuelta');

        const cmPalabra = Math.floor(this.cmBase / this.palabras.length);
        this.cmAcumulado = Math.max(0, this.cmAcumulado - cmPalabra);
        document.getElementById('cm-acumulado').textContent = `+${this.cmAcumulado} CM`;

        const progresoEl = document.getElementById('progreso-palabras');
        if (progresoEl) {
            progresoEl.textContent = `Palabras: ${this.palabrasResueltas.size} / ${this.palabras.length}`;
        }
        this.actualizarBarra();
    }

    marcarPalabraIncorrecta(palabra) {
        for (let i = 0; i < palabra.palabra.length; i++) {
            let f = palabra.fila;
            let c = palabra.col;
            if (palabra.direccion === 'horizontal') c += i;
            else f += i;

            const celda = document.querySelector(`.celda-crucigrama[data-fila="${f}"][data-col="${c}"]`);
            if (celda) {
                celda.classList.add('incorrecta');
                setTimeout(() => celda.classList.remove('incorrecta'), 1000);
            }
        }
    }

    actualizarVidasUI() {
        const vidas = document.querySelectorAll('#vidas-puzzle .vida');
        vidas.forEach((vida, i) => {
            if (i >= this.vidas) vida.classList.add('perdida');
        });
    }

    actualizarBarra() {
        const porcentaje = (this.palabrasResueltas.size / this.palabras.length) * 100;
        const barra = document.getElementById('barra-puzzle');
        if (barra) barra.style.width = `${porcentaje}%`;
    }

    iniciarTemporizador() {
        const elementoTiempo = document.getElementById('tiempo-restante');
        const elementoTemporizador = document.getElementById('temporizador');

        this.temporizador = setInterval(async () => {
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

                // ⚠️ Se acabó el tiempo: pierde 1 vida
                try {
                    const respuesta = await fetch('/api/perder_vida', { method: 'POST' });
                    const datos = await respuesta.json();
                    this.vidas = datos.vidas;
                } catch (error) {
                    console.error('Error perdiendo vida por timeout:', error);
                }

                const contenedor = document.getElementById('contenedor-puzzle');
                if (contenedor) {
                    contenedor.innerHTML = `
                        <div class="puzzle-derrota">
                            <div class="derrota-icono">⏱️</div>
                            <h2>¡Se acabó el tiempo!</h2>
                            <p>Perdiste 1 vida.</p>
                            <p class="derrota-info">Vidas restantes: ${this.vidas}</p>
                            <p>Redirigiendo al menú...</p>
                        </div>
                    `;
                }

                setTimeout(() => {
                    window.location.href = '/menu';
                }, 2000);
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

document.addEventListener('DOMContentLoaded', () => {
    if (window.DATOS_NIVEL && window.DATOS_NIVEL.tipo_puzzle === 'crucigrama') {
        window.puzzleInstance = new PuzzleCrucigrama(window.DATOS_NIVEL, {
            vidasIniciales: window.VIDAS_INICIALES
        });
    }
});