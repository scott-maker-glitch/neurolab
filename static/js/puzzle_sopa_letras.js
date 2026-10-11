/* ============================================================
   NEUROLAB - PUZZLE: SOPA DE LETRAS (v2 - con touch móvil)
   ============================================================ */

class PuzzleSopaLetras {
    constructor(datosNivel, opciones) {
        this.nivel = datosNivel.nivel;
        this.palabras = datosNivel.puzzle.palabras;
        this.gridSize = datosNivel.puzzle.grid_size;
        this.direcciones = datosNivel.puzzle.direcciones;
        this.tiempoTotal = datosNivel.tiempo_segundos;
        this.cmBase = datosNivel.cm_base;
        this.cmBonus = datosNivel.cm_bonus_tiempo;
        this.tiempoRestante = datosNivel.tiempo_segundos;
        this.vidas = opciones.vidasIniciales;
        this.cmAcumulado = 0;
        this.palabrasEncontradas = new Set();
        this.temporizador = null;

        this.seleccionando = false;
        this.celdaInicio = null;
        this.celdaFin = null;
        this.celdasSeleccionadas = [];

        this.grid = [];
        this.posicionesPalabras = {};

        this.generarGrid();
        this.inicializarUI();
    }

    generarGrid() {
        this.grid = Array(this.gridSize).fill(null).map(() =>
            Array(this.gridSize).fill('')
        );

        this.palabras.forEach(palabra => {
            let colocada = false;
            let intentos = 0;

            while (!colocada && intentos < 100) {
                intentos++;
                const direccion = this.direcciones[Math.floor(Math.random() * this.direcciones.length)];
                const posicion = this.intentarColocar(palabra, direccion);

                if (posicion) {
                    this.posicionesPalabras[palabra] = posicion;
                    colocada = true;
                }
            }
        });

        const letras = 'ABCDEFGHIJKLMNÑOPQRSTUVWXYZ';
        for (let i = 0; i < this.gridSize; i++) {
            for (let j = 0; j < this.gridSize; j++) {
                if (!this.grid[i][j]) {
                    this.grid[i][j] = letras[Math.floor(Math.random() * letras.length)];
                }
            }
        }
    }

    intentarColocar(palabra, direccion) {
        const fila = Math.floor(Math.random() * this.gridSize);
        const col = Math.floor(Math.random() * this.gridSize);
        const celdas = [];

        for (let i = 0; i < palabra.length; i++) {
            let f = fila, c = col;

            if (direccion === 'horizontal') c = col + i;
            else if (direccion === 'vertical') f = fila + i;

            if (f >= this.gridSize || c >= this.gridSize) return null;
            if (this.grid[f][c] && this.grid[f][c] !== palabra[i]) return null;

            celdas.push({ fila: f, col: c });
        }

        celdas.forEach((celda, i) => {
            this.grid[celda.fila][celda.col] = palabra[i];
        });

        return celdas;
    }

    inicializarUI() {
        const contenedor = document.getElementById('contenedor-puzzle');
        contenedor.innerHTML = `
            <div class="puzzle-sopa">
                <div class="puzzle-header">
                    <span class="puzzle-progreso">Palabras: ${this.palabrasEncontradas.size} / ${this.palabras.length}</span>
                    <span class="puzzle-cm" id="cm-acumulado">+${this.cmAcumulado} CM</span>
                </div>

                <div class="barra-progreso-puzzle">
                    <div class="barra-relleno" id="barra-puzzle"></div>
                </div>

                <div class="sopa-layout">
                    <div class="sopa-grid" id="sopa-grid"></div>
                    <div class="sopa-palabras">
                        <h3>Palabras a encontrar:</h3>
                        <ul id="lista-palabras">
                            ${this.palabras.map(p => `
                                <li class="palabra-item" data-palabra="${p}">${p}</li>
                            `).join('')}
                        </ul>
                    </div>
                </div>
            </div>
        `;

        this.renderizarGrid();
        this.configurarEventos();
        // ⏱️ El temporizador se inicia desde nivel.html cuando el jugador hace clic en "Continuar al puzzle"
        // this.iniciarTemporizador();
    }

    renderizarGrid() {
        const gridElement = document.getElementById('sopa-grid');
        gridElement.style.gridTemplateColumns = `repeat(${this.gridSize}, 1fr)`;

        gridElement.innerHTML = this.grid.map((fila, i) =>
            fila.map((letra, j) => `
                <div class="celda-sopa" data-fila="${i}" data-col="${j}">${letra}</div>
            `).join('')
        ).join('');
    }

    configurarEventos() {
        const grid = document.getElementById('sopa-grid');

        // Mouse
        grid.addEventListener('mousedown', (e) => this.iniciarSeleccion(e));
        grid.addEventListener('mouseover', (e) => this.extenderSeleccion(e));
        document.addEventListener('mouseup', () => this.terminarSeleccion());

        // Touch móvil — usar passive: false para poder hacer preventDefault
        grid.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            this.iniciarSeleccionDesdeTouch(touch);
        }, { passive: false });

        grid.addEventListener('touchmove', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            this.extenderSeleccionDesdeTouch(touch);
        }, { passive: false });

        grid.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.terminarSeleccion();
        }, { passive: false });

        grid.addEventListener('touchcancel', (e) => {
            e.preventDefault();
            this.limpiarSeleccion();
            this.seleccionando = false;
        }, { passive: false });
    }

    // ============================================================
    // HELPERS PARA OBTENER CELDA (mouse o touch)
    // ============================================================
    obtenerCeldaPorElemento(elemento) {
        if (!elemento || !elemento.classList) return null;
        if (!elemento.classList.contains('celda-sopa')) return null;
        return {
            fila: parseInt(elemento.dataset.fila),
            col: parseInt(elemento.dataset.col),
            elemento: elemento
        };
    }

    obtenerCeldaPorTouch(touch) {
        const elemento = document.elementFromPoint(touch.clientX, touch.clientY);
        return this.obtenerCeldaPorElemento(elemento);
    }

    // ============================================================
    // SELECCIÓN CON MOUSE
    // ============================================================
    iniciarSeleccion(e) {
        const celda = this.obtenerCeldaPorElemento(e.target);
        if (!celda) return;

        this.seleccionando = true;
        this.celdaInicio = celda;
        this.celdaFin = celda;
        this.celdasSeleccionadas = [celda];
        this.actualizarSeleccionVisual();
    }

    extenderSeleccion(e) {
        if (!this.seleccionando) return;
        const celda = this.obtenerCeldaPorElemento(e.target);
        if (!celda) return;
        this.extenderHastaCelda(celda);
    }

    // ============================================================
    // SELECCIÓN CON TOUCH
    // ============================================================
    iniciarSeleccionDesdeTouch(touch) {
        const celda = this.obtenerCeldaPorTouch(touch);
        if (!celda) return;

        this.seleccionando = true;
        this.celdaInicio = celda;
        this.celdaFin = celda;
        this.celdasSeleccionadas = [celda];
        this.actualizarSeleccionVisual();
    }

    extenderSeleccionDesdeTouch(touch) {
        if (!this.seleccionando) return;
        const celda = this.obtenerCeldaPorTouch(touch);
        if (!celda) return;
        this.extenderHastaCelda(celda);
    }

    // ============================================================
    // LÓGICA COMÚN DE EXTENSIÓN
    // ============================================================
    extenderHastaCelda(celda) {
        const df = celda.fila - this.celdaInicio.fila;
        const dc = celda.col - this.celdaInicio.col;

        if (df !== 0 && dc !== 0) return; // Solo recto
        if (df === 0 && dc === 0) return;

        this.celdaFin = celda;
        this.celdasSeleccionadas = this.calcularCeldasLinea(this.celdaInicio, celda);
        this.actualizarSeleccionVisual();
    }

    calcularCeldasLinea(inicio, fin) {
        const celdas = [];
        const df = Math.sign(fin.fila - inicio.fila);
        const dc = Math.sign(fin.col - inicio.col);

        let f = inicio.fila;
        let c = inicio.col;

        while (true) {
            const elemento = document.querySelector(`.celda-sopa[data-fila="${f}"][data-col="${c}"]`);
            if (!elemento) break;
            celdas.push({ fila: f, col: c, elemento });
            if (f === fin.fila && c === fin.col) break;
            f += df;
            c += dc;
        }

        return celdas;
    }

    actualizarSeleccionVisual() {
        document.querySelectorAll('.celda-sopa.seleccionada').forEach(el => el.classList.remove('seleccionada'));
        this.celdasSeleccionadas.forEach(c => c.elemento.classList.add('seleccionada'));
    }

    terminarSeleccion() {
        if (!this.seleccionando) return;
        this.seleccionando = false;

        if (this.celdasSeleccionadas.length < 2) {
            this.limpiarSeleccion();
            return;
        }

        const palabraSeleccionada = this.celdasSeleccionadas.map(c => this.grid[c.fila][c.col]).join('');
        const palabraInvertida = palabraSeleccionada.split('').reverse().join('');

        const palabraEncontrada = this.palabras.find(p =>
            !this.palabrasEncontradas.has(p) && (p === palabraSeleccionada || p === palabraInvertida)
        );

        if (palabraEncontrada) {
            this.acierto(palabraEncontrada);
        } else {
            this.fallo();
        }
    }

    acierto(palabra) {
        this.palabrasEncontradas.add(palabra);

        this.celdasSeleccionadas.forEach(c => {
            c.elemento.classList.remove('seleccionada');
            c.elemento.classList.add('encontrada');
        });

        const item = document.querySelector(`.palabra-item[data-palabra="${palabra}"]`);
        if (item) item.classList.add('encontrada');

        const cmPalabra = Math.floor(this.cmBase / this.palabras.length);
        this.cmAcumulado += cmPalabra;
        document.getElementById('cm-acumulado').textContent = `+${this.cmAcumulado} CM`;

        document.querySelector('.puzzle-progreso').textContent = `Palabras: ${this.palabrasEncontradas.size} / ${this.palabras.length}`;
        this.actualizarBarra();

        if (this.palabrasEncontradas.size >= this.palabras.length) {
            setTimeout(() => this.completarNivel(), 800);
        }

        this.celdasSeleccionadas = [];
    }

    async fallo() {
        // En la sopa de letras NO se pierden vidas. Solo se limpia la selección
        // y se muestra un pequeño feedback visual.
        this.limpiarSeleccion();

        const grid = document.getElementById('sopa-grid');
        if (grid) {
            grid.classList.add('intento-fallido');
            setTimeout(() => grid.classList.remove('intento-fallido'), 400);
        }
    }

    limpiarSeleccion() {
        this.celdasSeleccionadas.forEach(c => c.elemento.classList.remove('seleccionada'));
        this.celdasSeleccionadas = [];
        this.celdaInicio = null;
        this.celdaFin = null;
    }

    actualizarVidasUI() {
        const vidas = document.querySelectorAll('#vidas-puzzle .vida');
        vidas.forEach((vida, i) => {
            if (i >= this.vidas) vida.classList.add('perdida');
        });
    }

    actualizarBarra() {
        const porcentaje = (this.palabrasEncontradas.size / this.palabras.length) * 100;
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
    if (window.DATOS_NIVEL && window.DATOS_NIVEL.tipo_puzzle === 'sopa_de_letras') {
        window.puzzleInstance = new PuzzleSopaLetras(window.DATOS_NIVEL, {
            vidasIniciales: window.VIDAS_INICIALES
        });
    }
});