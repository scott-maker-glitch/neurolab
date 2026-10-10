/* ============================================================
   NEUROLAB - PUZZLE: CRUCIGRAMA (versión corregida)
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

        this.grid = [];
        this.celdas = {};
        this.celdaActiva = null;
        this.direccionActiva = 'horizontal';

        this.construirGrid();
        this.inicializarUI();
    }

    // ============================================================
    // CONSTRUCCIÓN DEL GRID
    // ============================================================
    construirGrid() {
        // 1. Inicializar grid vacío
        for (let f = 0; f < this.gridAlto; f++) {
            this.grid[f] = [];
            for (let c = 0; c < this.gridAncho; c++) {
                this.grid[f][c] = { tipo: 'negra', letra: '', palabras: [] };
            }
        }

        // 2. Colocar cada palabra
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

                // Verificar que esté dentro del grid
                if (f < 0 || f >= this.gridAlto || c < 0 || c >= this.gridAncho) {
                    console.error('Palabra fuera del grid:', palabra, f, c);
                    continue;
                }

                // Marcar casilla como blanca
                this.grid[f][c].tipo = 'blanca';
                this.grid[f][c].palabras.push(palabra.numero);

                // Guardar referencia
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

    // ============================================================
    // UI
    // ============================================================
    inicializarUI() {
        const contenedor = document.getElementById('contenedor-puzzle');
        const horizontales = this.palabras.filter(p => p.direccion === 'horizontal');
        const verticales = this.palabras.filter(p => p.direccion === 'vertical');

        contenedor.innerHTML = `
            <div class="puzzle-crucigrama">
                <div class="puzzle-header">
                    <span class="puzzle-progreso">Palabras: ${this.palabrasResueltas.size} / ${this.palabras.length}</span>
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

                <div class="crucigrama-controles">
                    <button class="boton-verificar" id="btn-verificar">✓ Verificar crucigrama</button>
                </div>
            </div>
        `;

        this.configurarEventos();
        this.iniciarTemporizador();
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
                            <input type="text" maxlength="1" class="celda-input" data-fila="${f}" data-col="${c}" autocomplete="off">
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

        const btnVerificar = document.getElementById('btn-verificar');
        if (btnVerificar) {
            btnVerificar.addEventListener('click', () => this.verificarCrucigrama());
        }
    }

    alEscribir(input) {
        const valor = input.value.toUpperCase();
        input.value = valor;

        if (valor) {
            this.verificarPalabraActual(input);
            this.moverSiguiente(input);
        }
    }

    alPresionarTecla(e) {
        const input = e.target;

        if (e.key === 'ArrowRight') {
            e.preventDefault();
            this.moverAlSiguienteHorizontal(input);
        } else if (e.key === 'ArrowLeft') {
            e.preventDefault();
            this.moverAlAnteriorHorizontal(input);
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            this.moverAlSiguienteVertical(input);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            this.moverAlAnteriorVertical(input);
        } else if (e.key === 'Backspace' && !input.value) {
            e.preventDefault();
            this.moverAnterior(input);
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

    moverSiguiente(input) {
        if (this.direccionActiva === 'horizontal') {
            this.moverAlSiguienteHorizontal(input);
        } else {
            this.moverAlSiguienteVertical(input);
        }
    }

    moverSiguienteHorizontal(input) {
        const fila = parseInt(input.dataset.fila);
        const col = parseInt(input.dataset.col);
        const siguiente = document.querySelector(`.celda-input[data-fila="${fila}"][data-col="${col + 1}"]`);
        if (siguiente) siguiente.focus();
    }

    moverAlAnteriorHorizontal(input) {
        const fila = parseInt(input.dataset.fila);
        const col = parseInt(input.dataset.col);
        const anterior = document.querySelector(`.celda-input[data-fila="${fila}"][data-col="${col - 1}"]`);
        if (anterior) anterior.focus();
    }

    moverAlSiguienteVertical(input) {
        const fila = parseInt(input.dataset.fila);
        const col = parseInt(input.dataset.col);
        const siguiente = document.querySelector(`.celda-input[data-fila="${fila + 1}"][data-col="${col}"]`);
        if (siguiente) siguiente.focus();
    }

    moverAlAnteriorVertical(input) {
        const fila = parseInt(input.dataset.fila);
        const col = parseInt(input.dataset.col);
        const anterior = document.querySelector(`.celda-input[data-fila="${fila - 1}"][data-col="${col}"]`);
        if (anterior) anterior.focus();
    }

    moverAnterior(input) {
        if (this.direccionActiva === 'horizontal') {
            this.moverAlAnteriorHorizontal(input);
        } else {
            this.moverAlAnteriorVertical(input);
        }
    }

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
        if (this.palabrasResueltas.has(palabra.numero)) return;

        let palabraActual = '';
        for (let i = 0; i < palabra.palabra.length; i++) {
            let f = palabra.fila;
            let c = palabra.col;
            if (palabra.direccion === 'horizontal') c += i;
            else f += i;

            const input = document.querySelector(`.celda-input[data-fila="${f}"][data-col="${c}"]`);
            if (input) palabraActual += input.value.toUpperCase();
        }

        if (palabraActual === palabra.palabra) {
            this.marcarPalabraResuelta(palabra);
        }
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

        document.querySelector('.puzzle-progreso').textContent = `Palabras: ${this.palabrasResueltas.size} / ${this.palabras.length}`;
        this.actualizarBarra();

        if (this.palabrasResueltas.size >= this.palabras.length) {
            setTimeout(() => this.completarNivel(), 800);
        }
    }

    async verificarCrucigrama() {
        let errores = 0;

        this.palabras.forEach(palabra => {
            if (this.palabrasResueltas.has(palabra.numero)) return;

            let palabraActual = '';
            for (let i = 0; i < palabra.palabra.length; i++) {
                let f = palabra.fila;
                let c = palabra.col;
                if (palabra.direccion === 'horizontal') c += i;
                else f += i;

                const input = document.querySelector(`.celda-input[data-fila="${f}"][data-col="${c}"]`);
                if (input) palabraActual += input.value.toUpperCase();
            }

            if (palabraActual === palabra.palabra) {
                this.marcarPalabraResuelta(palabra);
            } else if (palabraActual.length === palabra.palabra.length) {
                errores++;
                this.marcarPalabraIncorrecta(palabra);
            }
        });

        if (errores > 0) {
            try {
                const respuesta = await fetch('/api/perder_vida', { method: 'POST' });
                const datos = await respuesta.json();
                this.vidas = datos.vidas;
                this.actualizarVidasUI();

                if (this.vidas <= 0) {
                    setTimeout(() => this.derrota('Te quedaste sin vidas'), 1000);
                }
            } catch (error) {
                console.error('Error perdiendo vida:', error);
            }
        }
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
                setTimeout(() => celda.classList.remove('incorrecta'), 1500);
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

document.addEventListener('DOMContentLoaded', () => {
    if (window.DATOS_NIVEL && window.DATOS_NIVEL.tipo_puzzle === 'crucigrama') {
        new PuzzleCrucigrama(window.DATOS_NIVEL, {
            vidasIniciales: window.VIDAS_INICIALES
        });
    }
});