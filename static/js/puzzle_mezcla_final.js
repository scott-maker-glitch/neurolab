/* ============================================================
   NEUROLAB - PUZZLE: MEZCLA FINAL (Nivel 10) - v7
   - Sopa de letras: cálculo por coordenadas (funciona en iOS)
   - Memorama: 3 errores = 1 vida
   - Crucigrama: 3 errores = 1 vida
   - Frase final: 1 error = 1 vida
   ============================================================ */

class PuzzleMezclaFinal {
    constructor(datosNivel, opciones) {
        this.nivel = datosNivel.nivel;
        this.retos = datosNivel.puzzle.retos;
        this.tiempoTotal = datosNivel.tiempo_segundos;
        this.cmBase = datosNivel.cm_base;
        this.cmBonus = datosNivel.cm_bonus_tiempo;
        this.tiempoRestante = datosNivel.tiempo_segundos;
        this.vidas = opciones.vidasIniciales;
        this.cmAcumulado = 0;
        this.faseActual = 0;
        this.temporizador = null;

        this.memIntentosFallidos = 0;
        this.memERRORES_POR_VIDA = 3;
        this.cruciIntentosFallidos = 0;
        this.cruciERRORES_POR_VIDA = 3;

        this.inicializarUI();
    }

    inicializarUI() {
        const contenedor = document.getElementById('contenedor-puzzle');
        contenedor.innerHTML = `
            <div class="puzzle-mezcla">
                <div class="puzzle-header">
                    <span class="puzzle-progreso" id="progreso-fase">Fase ${this.faseActual + 1} / ${this.retos.length}</span>
                    <span class="puzzle-cm" id="cm-acumulado">+${this.cmAcumulado} CM</span>
                </div>

                <div class="barra-progreso-puzzle">
                    <div class="barra-relleno" id="barra-puzzle"></div>
                </div>

                <div class="mezcla-contenido" id="mezcla-contenido"></div>
            </div>
        `;

        this.renderizarFase();
        this.actualizarBarra();
    }

    actualizarBarra() {
        const porcentaje = (this.faseActual / this.retos.length) * 100;
        const barra = document.getElementById('barra-puzzle');
        if (barra) barra.style.width = `${porcentaje}%`;
        const prog = document.getElementById('progreso-fase');
        if (prog) prog.textContent = `Fase ${this.faseActual + 1} / ${this.retos.length}`;
    }

    renderizarFase() {
        const reto = this.retos[this.faseActual];
        const contenedor = document.getElementById('mezcla-contenido');
        if (!contenedor) return;

        if (reto.tipo === 'completar_frase') this.renderCompletarFrase(contenedor, reto);
        else if (reto.tipo === 'verdadero_falso') this.renderVerdaderoFalso(contenedor, reto);
        else if (reto.tipo === 'sopa_de_letras_corta') this.renderSopaCorta(contenedor, reto);
        else if (reto.tipo === 'memorama') this.renderMemorama(contenedor, reto);
        else if (reto.tipo === 'crucigrama') this.renderCrucigrama(contenedor, reto);
        else if (reto.tipo === 'frase_final') this.renderFraseFinal(contenedor, reto);

        this.actualizarBarra();
    }

    // ============================================================
    // FASE 1: COMPLETAR FRASE
    // ============================================================
    renderCompletarFrase(contenedor, reto) {
        const partes = reto.texto.split('___');
        contenedor.innerHTML = `
            <div class="mezcla-fase">
                <div class="fase-icono">📝</div>
                <h2 class="fase-titulo">Fase 1: Completa la frase</h2>
                <p class="fase-frase">${partes[0]}<span class="espacio-blanco" id="espacio-blanco">___</span>${partes[1] || ''}</p>
                <div class="opciones-puzzle">
                    ${reto.opciones.map(op => `<button class="opcion" data-opcion="${op}">${op}</button>`).join('')}
                </div>
            </div>
        `;

        document.querySelectorAll('.mezcla-fase .opcion').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const opcion = e.target.dataset.opcion;
                if (opcion.toLowerCase() === reto.respuesta.toLowerCase()) {
                    e.target.classList.add('correcto');
                    const esp = document.getElementById('espacio-blanco');
                    esp.textContent = reto.respuesta;
                    esp.classList.add('rellenado');
                    this.siguienteFase(50);
                } else {
                    e.target.classList.add('incorrecto');
                    this.perderVida(() => e.target.classList.remove('incorrecto'));
                }
            });
        });
    }

    // ============================================================
    // FASE 2: VERDADERO / FALSO
    // ============================================================
    renderVerdaderoFalso(contenedor, reto) {
        contenedor.innerHTML = `
            <div class="mezcla-fase">
                <div class="fase-icono">🤔</div>
                <h2 class="fase-titulo">Fase 2: ¿Verdadero o falso?</h2>
                <p class="fase-frase">${reto.texto}</p>
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
            </div>
        `;

        document.querySelectorAll('.mezcla-fase .vf-boton').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const respuesta = e.currentTarget.dataset.respuesta === 'true';
                if (respuesta === reto.respuesta) {
                    e.currentTarget.classList.add('correcto');
                    this.siguienteFase(50);
                } else {
                    e.currentTarget.classList.add('incorrecto');
                    this.perderVida(() => e.currentTarget.classList.remove('incorrecto'));
                }
            });
        });
    }

    // ============================================================
    // FASE 3: SOPA DE LETRAS (CON CÁLCULO POR COORDENADAS)
    // ============================================================
    renderSopaCorta(contenedor, reto) {
        const size = reto.grid_size || 12;
        const grid = Array(size).fill(null).map(() => Array(size).fill(''));
        const palabras = reto.palabras;

        palabras.forEach(palabra => {
            let colocada = false, intentos = 0;
            while (!colocada && intentos < 200) {
                intentos++;
                const dir = Math.random() < 0.5 ? 'h' : 'v';
                const f = Math.floor(Math.random() * size);
                const c = Math.floor(Math.random() * size);
                let cabe = true;
                const celdas = [];
                for (let i = 0; i < palabra.length; i++) {
                    let ff = f, cc = c;
                    if (dir === 'h') cc += i; else ff += i;
                    if (ff >= size || cc >= size) { cabe = false; break; }
                    if (grid[ff][cc] && grid[ff][cc] !== palabra[i]) { cabe = false; break; }
                    celdas.push({ f: ff, c: cc });
                }
                if (cabe) {
                    celdas.forEach((celda, i) => { grid[celda.f][celda.c] = palabra[i]; });
                    colocada = true;
                }
            }
        });

        const letras = 'ABCDEFGHIJKLMNÑOPQRSTUVWXYZ';
        for (let i = 0; i < size; i++)
            for (let j = 0; j < size; j++)
                if (!grid[i][j]) grid[i][j] = letras[Math.floor(Math.random() * letras.length)];

        this.sopaState = {
            grid,
            palabras,
            encontradas: new Set(),
            seleccionando: false,
            celdas: [],
            inicio: null,
            size: size
        };

        contenedor.innerHTML = `
            <div class="mezcla-fase">
                <div class="fase-icono">🔍</div>
                <h2 class="fase-titulo">Fase 3: Sopa de letras</h2>
                <div class="sopa-corta-layout">
                    <div class="sopa-corta-grid" id="sopa-corta" style="grid-template-columns: repeat(${size}, 1fr);">
                        ${grid.map((fila, f) => fila.map((letra, c) =>
                            `<div class="celda-sopa-corta" data-fila="${f}" data-col="${c}">${letra}</div>`
                        ).join('')).join('')}
                    </div>
                    <div class="sopa-corta-palabras">
                        <h3>Palabras a encontrar:</h3>
                        <ul id="lista-palabras-corta">
                            ${palabras.map(p => `
                                <li class="palabra-item-corta" data-palabra="${p}">${p}</li>
                            `).join('')}
                        </ul>
                        <p class="sopa-progreso">Encontradas: <span id="sopa-contador">0</span> / ${palabras.length}</p>
                    </div>
                </div>
            </div>
        `;

        const gridEl = document.getElementById('sopa-corta');

        // ============================================================
        // CÁLCULO POR COORDENADAS (funciona en iOS y Android)
        // ============================================================
        const obtenerCeldaPorCoordenadas = (clientX, clientY) => {
        // Buscar cualquier celda para medir su tamaño real
        const celdaRef = gridEl.querySelector('.celda-sopa-corta');
        if (!celdaRef) return null;

        const rectGrid = gridEl.getBoundingClientRect();
        const rectCelda = celdaRef.getBoundingClientRect();

        // Verificar que el toque esté dentro del grid
        if (clientX < rectGrid.left || clientX > rectGrid.right ||
            clientY < rectGrid.top || clientY > rectGrid.bottom) {
            return null;
        }

        // Tamaño real de una celda + el gap (2px)
        const celdaAncho = rectCelda.width + 2;
        const celdaAlto = rectCelda.height + 2;

        // Offset del padding (desde el borde del grid hasta la primera celda)
        const offsetX = rectCelda.left - rectGrid.left;
        const offsetY = rectCelda.top - rectGrid.top;

        // Posición relativa dentro del área de celdas
        const x = clientX - rectGrid.left - offsetX + (celdaAncho - rectCelda.width) / 2;
        const y = clientY - rectGrid.top - offsetY + (celdaAlto - rectCelda.height) / 2;

        const col = Math.floor(x / celdaAncho);
        const fila = Math.floor(y / celdaAlto);

        if (fila < 0 || fila >= size || col < 0 || col >= size) return null;

        const el = gridEl.querySelector(`.celda-sopa-corta[data-fila="${fila}"][data-col="${col}"]`);
        if (!el) return null;

        return { f: fila, c: col, el };
    };

        const iniciar = (celda) => {
            if (!celda) return;
            this.sopaState.seleccionando = true;
            this.sopaState.inicio = celda;
            this.sopaState.celdas = [celda];
            this.actualizarSelSopa();
        };

        const extender = (celda) => {
            if (!this.sopaState.seleccionando) return;
            if (!celda || !this.sopaState.inicio) return;
            const df = celda.f - this.sopaState.inicio.f;
            const dc = celda.c - this.sopaState.inicio.c;
            if (df !== 0 && dc !== 0) return;
            const pasos = Math.max(Math.abs(df), Math.abs(dc));
            const sf = Math.sign(df), sc = Math.sign(dc);
            this.sopaState.celdas = [];
            for (let i = 0; i <= pasos; i++) {
                const ff = this.sopaState.inicio.f + sf * i;
                const cc = this.sopaState.inicio.c + sc * i;
                const el = gridEl.querySelector(`.celda-sopa-corta[data-fila="${ff}"][data-col="${cc}"]`);
                if (el) this.sopaState.celdas.push({ f: ff, c: cc, el });
            }
            this.actualizarSelSopa();
        };

        const terminar = () => {
            if (!this.sopaState.seleccionando) return;
            this.sopaState.seleccionando = false;

            if (this.sopaState.celdas.length < 2) {
                this.sopaState.celdas.forEach(c => c.el.classList.remove('seleccionada'));
                this.sopaState.celdas = [];
                return;
            }

            const palabra = this.sopaState.celdas.map(c => this.sopaState.grid[c.f][c.c]).join('');
            const inv = palabra.split('').reverse().join('');
            const enc = this.sopaState.palabras.find(p => !this.sopaState.encontradas.has(p) && (p === palabra || p === inv));

            if (enc) {
                this.sopaState.encontradas.add(enc);
                this.sopaState.celdas.forEach(c => {
                    c.el.classList.remove('seleccionada');
                    c.el.classList.add('encontrada-sopa');
                });

                const item = document.querySelector(`.palabra-item-corta[data-palabra="${enc}"]`);
                if (item) item.classList.add('encontrada');

                const contadorEl = document.getElementById('sopa-contador');
                if (contadorEl) contadorEl.textContent = this.sopaState.encontradas.size;
                if (this.sopaState.encontradas.size >= this.sopaState.palabras.length) this.siguienteFase(80);
            } else {
                this.sopaState.celdas.forEach(c => c.el.classList.remove('seleccionada'));
                if (gridEl) {
                    gridEl.classList.add('intento-fallido');
                    setTimeout(() => gridEl.classList.remove('intento-fallido'), 400);
                }
            }
            this.sopaState.celdas = [];
        };

        // ============================================================
        // EVENTOS MOUSE (desktop)
        // ============================================================
        gridEl.addEventListener('mousedown', (e) => {
            const celda = obtenerCeldaPorCoordenadas(e.clientX, e.clientY);
            if (celda) {
                e.preventDefault();
                iniciar(celda);
            }
        });
        gridEl.addEventListener('mousemove', (e) => {
            if (!this.sopaState.seleccionando) return;
            const celda = obtenerCeldaPorCoordenadas(e.clientX, e.clientY);
            if (celda) extender(celda);
        });
        document.addEventListener('mouseup', terminar);

        // ============================================================
        // EVENTOS TOUCH (móvil) - Los importantes
        // ============================================================
        gridEl.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            const celda = obtenerCeldaPorCoordenadas(touch.clientX, touch.clientY);
            if (celda) iniciar(celda);
        }, { passive: false });

        gridEl.addEventListener('touchmove', (e) => {
            e.preventDefault();
            if (!this.sopaState.seleccionando) return;
            const touch = e.touches[0];
            const celda = obtenerCeldaPorCoordenadas(touch.clientX, touch.clientY);
            if (celda) extender(celda);
        }, { passive: false });

        gridEl.addEventListener('touchend', (e) => {
            e.preventDefault();
            terminar();
        }, { passive: false });

        gridEl.addEventListener('touchcancel', (e) => {
            e.preventDefault();
            this.sopaState.celdas.forEach(c => c.el.classList.remove('seleccionada'));
            this.sopaState.celdas = [];
            this.sopaState.seleccionando = false;
        }, { passive: false });
    }

    actualizarSelSopa() {
        document.querySelectorAll('.celda-sopa-corta.seleccionada').forEach(el => el.classList.remove('seleccionada'));
        this.sopaState.celdas.forEach(c => c.el.classList.add('seleccionada'));
    }

    // ============================================================
    // FASE 4: MEMORAMA (3 errores = 1 vida)
    // ============================================================
    renderMemorama(contenedor, reto) {
        const cartas = [];
        reto.pares.forEach((par, idx) => {
            cartas.push({ tipo: 'termino', texto: par.termino, parId: idx });
            cartas.push({ tipo: 'definicion', texto: par.definicion, parId: idx });
        });
        for (let i = cartas.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [cartas[i], cartas[j]] = [cartas[j], cartas[i]];
        }

        this.memIntentosFallidos = 0;
        this.memState = { volt: [], enc: 0, total: reto.pares.length, bloqueado: false };

        contenedor.innerHTML = `
            <div class="mezcla-fase">
                <div class="fase-icono">🎴</div>
                <h2 class="fase-titulo">Fase 4: Memorama</h2>
                <p class="fase-instruccion">
                    Empareja término con definición.
                    Pares: <span id="mem-contador">0</span> / ${reto.pares.length}
                    · Fallos: <span id="mem-fallos">0</span> / ${this.memERRORES_POR_VIDA}
                </p>
                <div class="memorama-grid-mini">
                    ${cartas.map((c, i) => `
                        <div class="carta-memorama" data-indice="${i}" data-par-id="${c.parId}" data-tipo="${c.tipo}">
                            <div class="carta-inner">
                                <div class="carta-cara carta-atras">?</div>
                                <div class="carta-cara carta-frente ${c.tipo === 'termino' ? 'es-termino' : 'es-definicion'}">${c.texto}</div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;

        document.querySelectorAll('.mezcla-fase .memorama-grid-mini .carta-memorama').forEach(carta => {
            carta.addEventListener('click', () => this.voltearMini(carta));
        });
    }

    voltearMini(carta) {
        if (this.memState.bloqueado) return;
        if (carta.classList.contains('volteada') || carta.classList.contains('encontrada')) return;
        carta.classList.add('volteada');
        this.memState.volt.push(carta);
        if (this.memState.volt.length === 2) {
            this.memState.bloqueado = true;
            const [c1, c2] = this.memState.volt;
            const p1 = +c1.dataset.parId, p2 = +c2.dataset.parId;
            const t1 = c1.dataset.tipo, t2 = c2.dataset.tipo;
            if (p1 === p2 && t1 !== t2) {
                setTimeout(() => {
                    c1.classList.add('encontrada');
                    c2.classList.add('encontrada');
                    this.memState.enc++;
                    const contadorEl = document.getElementById('mem-contador');
                    if (contadorEl) contadorEl.textContent = this.memState.enc;
                    this.memState.volt = [];
                    this.memState.bloqueado = false;
                    if (this.memState.enc >= this.memState.total) this.siguienteFase(80);
                }, 600);
            } else {
                setTimeout(() => {
                    c1.classList.add('incorrecta');
                    c2.classList.add('incorrecta');

                    this.memIntentosFallidos++;
                    const fallosEl = document.getElementById('mem-fallos');
                    if (fallosEl) fallosEl.textContent = this.memIntentosFallidos;

                    if (this.memIntentosFallidos >= this.memERRORES_POR_VIDA) {
                        this.memIntentosFallidos = 0;
                        if (fallosEl) fallosEl.textContent = 0;
                        this.perderVida(() => {
                            c1.classList.remove('volteada', 'incorrecta');
                            c2.classList.remove('volteada', 'incorrecta');
                            this.memState.volt = [];
                            this.memState.bloqueado = false;
                        });
                    } else {
                        setTimeout(() => {
                            c1.classList.remove('volteada', 'incorrecta');
                            c2.classList.remove('volteada', 'incorrecta');
                            this.memState.volt = [];
                            this.memState.bloqueado = false;
                        }, 1000);
                    }
                }, 800);
            }
        }
    }

    // ============================================================
    // FASE 5: CRUCIGRAMA
    // ============================================================
    renderCrucigrama(contenedor, reto) {
        const gridAncho = reto.grid_ancho || 12;
        const gridAlto = reto.grid_alto || 8;
        const palabras = reto.palabras;

        this.cruciIntentosFallidos = 0;

        const grid = [];
        for (let f = 0; f < gridAlto; f++) {
            grid[f] = [];
            for (let c = 0; c < gridAncho; c++) {
                grid[f][c] = { tipo: 'negra', letra: '', palabras: [] };
            }
        }

        palabras.forEach(palabra => {
            const letras = palabra.palabra;
            for (let i = 0; i < letras.length; i++) {
                let f = palabra.fila;
                let c = palabra.col;
                if (palabra.direccion === 'horizontal') c += i;
                else f += i;

                if (f < 0 || f >= gridAlto || c < 0 || c >= gridAncho) continue;

                grid[f][c].tipo = 'blanca';
                grid[f][c].palabras.push(palabra.numero);
            }
        });

        contenedor.innerHTML = `
            <div class="mezcla-fase">
                <div class="fase-icono">🧩</div>
                <h2 class="fase-titulo">Fase 5: Crucigrama</h2>
                <p class="fase-instruccion" style="color: var(--color-advertencia); font-weight: 600;">
                    ⚠️ Cada 3 palabras erróneas pierdes 1 vida
                </p>
                <div class="crucigrama-layout" style="margin-top: 1rem; text-align: left;">
                    <div class="crucigrama-grid" id="cruci-grid-10" style="--grid-ancho: ${gridAncho};">
                        ${grid.map((fila, f) => fila.map((celda, c) => {
                            if (celda.tipo === 'negra') {
                                return `<div class="celda-crucigrama negra"></div>`;
                            }
                            const palabraEmpiezaAqui = palabras.find(p => p.fila === f && p.col === c);
                            const numero = palabraEmpiezaAqui ? palabraEmpiezaAqui.numero : '';
                            return `
                                <div class="celda-crucigrama blanca" data-fila="${f}" data-col="${c}">
                                    ${numero ? `<span class="celda-numero">${numero}</span>` : ''}
                                    <input type="text" maxlength="1" class="celda-input" data-fila="${f}" data-col="${c}" autocomplete="off" inputmode="text">
                                </div>
                            `;
                        }).join('')).join('')}
                    </div>
                    <div class="crucigrama-pistas">
                        <div class="pistas-seccion">
                            <h3>Pistas</h3>
                            <ul>
                                ${palabras.map(p => `
                                    <li class="pista-item" data-palabra="${p.numero}">
                                        <strong>${p.numero}.</strong> ${p.pista} <em>(${p.palabra.length} letras)</em>
                                    </li>
                                `).join('')}
                            </ul>
                        </div>
                    </div>
                </div>
                <div class="crucigrama-controles" style="margin-top: 1.5rem;">
                    <button class="boton" id="btn-verificar-cruci">Verificar crucigrama</button>
                </div>
                <p style="margin-top: 1rem; color: var(--color-texto-suave); font-size: 0.9rem;">
                    Fallos: <span id="cruci-fallos">0</span> / ${this.cruciERRORES_POR_VIDA}
                </p>
            </div>
        `;

        const inputs = document.querySelectorAll('#cruci-grid-10 .celda-input');
        let direccionActiva = 'horizontal';

        const moverAlSiguienteHorizontal = (input) => {
            const fila = parseInt(input.dataset.fila);
            const col = parseInt(input.dataset.col);
            for (let c = col + 1; c < gridAncho; c++) {
                const sig = document.querySelector(`#cruci-grid-10 .celda-input[data-fila="${fila}"][data-col="${c}"]`);
                if (sig) { sig.focus(); return; }
            }
        };

        const moverAlAnteriorHorizontal = (input) => {
            const fila = parseInt(input.dataset.fila);
            const col = parseInt(input.dataset.col);
            for (let c = col - 1; c >= 0; c--) {
                const ant = document.querySelector(`#cruci-grid-10 .celda-input[data-fila="${fila}"][data-col="${c}"]`);
                if (ant) { ant.focus(); return; }
            }
        };

        const moverAlSiguienteVertical = (input) => {
            const fila = parseInt(input.dataset.fila);
            const col = parseInt(input.dataset.col);
            for (let f = fila + 1; f < gridAlto; f++) {
                const sig = document.querySelector(`#cruci-grid-10 .celda-input[data-fila="${f}"][data-col="${col}"]`);
                if (sig) { sig.focus(); return; }
            }
        };

        const moverAlAnteriorVertical = (input) => {
            const fila = parseInt(input.dataset.fila);
            const col = parseInt(input.dataset.col);
            for (let f = fila - 1; f >= 0; f--) {
                const ant = document.querySelector(`#cruci-grid-10 .celda-input[data-fila="${f}"][data-col="${col}"]`);
                if (ant) { ant.focus(); return; }
            }
        };

        const moverSiguiente = (input) => {
            if (direccionActiva === 'horizontal') moverAlSiguienteHorizontal(input);
            else moverAlSiguienteVertical(input);
        };

        const moverAnterior = (input) => {
            if (direccionActiva === 'horizontal') moverAlAnteriorHorizontal(input);
            else moverAlAnteriorVertical(input);
        };

        inputs.forEach(input => {
            input.addEventListener('input', (e) => {
                const v = e.target.value.toUpperCase().replace(/[^A-ZÁÉÍÓÚÑ]/g, '');
                e.target.value = v.slice(-1);

                if (e.target.value) {
                    this.verificarPalabrasCruci(palabras, inputs);
                    moverSiguiente(input);
                }
            });

            input.addEventListener('keydown', (e) => {
                if (e.key === 'ArrowRight') {
                    e.preventDefault(); direccionActiva = 'horizontal'; moverAlSiguienteHorizontal(input);
                } else if (e.key === 'ArrowLeft') {
                    e.preventDefault(); direccionActiva = 'horizontal'; moverAlAnteriorHorizontal(input);
                } else if (e.key === 'ArrowDown') {
                    e.preventDefault(); direccionActiva = 'vertical'; moverAlSiguienteVertical(input);
                } else if (e.key === 'ArrowUp') {
                    e.preventDefault(); direccionActiva = 'vertical'; moverAlAnteriorVertical(input);
                } else if (e.key === 'Backspace') {
                    if (input.value) {
                        input.value = '';
                        e.preventDefault();
                        this.verificarPalabrasCruci(palabras, inputs);
                    } else {
                        e.preventDefault();
                        moverAnterior(input);
                        setTimeout(() => {
                            if (document.activeElement && document.activeElement.classList.contains('celda-input')) {
                                document.activeElement.value = '';
                                this.verificarPalabrasCruci(palabras, inputs);
                            }
                        }, 10);
                    }
                } else if (e.key === 'Delete') {
                    input.value = '';
                    this.verificarPalabrasCruci(palabras, inputs);
                } else if (e.key === 'Tab') {
                    e.preventDefault();
                    moverSiguiente(input);
                }
            });

            input.addEventListener('focus', (e) => {
                const fila = parseInt(e.target.dataset.fila);
                const col = parseInt(e.target.dataset.col);

                const palabraHorizontal = palabras.find(p =>
                    p.direccion === 'horizontal' &&
                    p.fila === fila &&
                    col >= p.col &&
                    col < p.col + p.palabra.length
                );

                direccionActiva = palabraHorizontal ? 'horizontal' : 'vertical';

                document.querySelectorAll('.pista-item').forEach(el => el.classList.remove('activa'));
                const palabraActiva = palabras.find(p => {
                    if (p.direccion !== direccionActiva) return false;
                    if (direccionActiva === 'horizontal') {
                        return p.fila === fila && col >= p.col && col < p.col + p.palabra.length;
                    } else {
                        return p.col === col && fila >= p.fila && fila < p.fila + p.palabra.length;
                    }
                });
                if (palabraActiva) {
                    const pistaEl = document.querySelector(`.pista-item[data-palabra="${palabraActiva.numero}"]`);
                    if (pistaEl) pistaEl.classList.add('activa');
                }
            });
        });

        document.querySelectorAll('.pista-item').forEach(pista => {
            pista.addEventListener('click', () => {
                const numPalabra = parseInt(pista.dataset.palabra);
                const palabra = palabras.find(p => p.numero === numPalabra);
                if (!palabra) return;

                const input = document.querySelector(`#cruci-grid-10 .celda-input[data-fila="${palabra.fila}"][data-col="${palabra.col}"]`);
                if (input) input.focus();
            });
        });

        const btnVerificar = document.getElementById('btn-verificar-cruci');
        if (btnVerificar) {
            btnVerificar.addEventListener('click', () => {
                let errores = 0;
                palabras.forEach(palabra => {
                    let actual = '';
                    for (let i = 0; i < palabra.palabra.length; i++) {
                        let f = palabra.fila;
                        let c = palabra.col;
                        if (palabra.direccion === 'horizontal') c += i;
                        else f += i;
                        const input = document.querySelector(`#cruci-grid-10 .celda-input[data-fila="${f}"][data-col="${c}"]`);
                        if (input) actual += input.value.toUpperCase();
                    }
                    if (actual === palabra.palabra) {
                        for (let i = 0; i < palabra.palabra.length; i++) {
                            let f = palabra.fila;
                            let c = palabra.col;
                            if (palabra.direccion === 'horizontal') c += i;
                            else f += i;
                            const celda = document.querySelector(`#cruci-grid-10 .celda-crucigrama[data-fila="${f}"][data-col="${c}"]`);
                            if (celda) celda.classList.add('resuelta');
                        }
                    } else if (actual.length === palabra.palabra.length) {
                        errores++;
                    }
                });

                if (errores > 0) {
                    this.cruciIntentosFallidos += errores;
                    const fallosEl = document.getElementById('cruci-fallos');

                    while (this.cruciIntentosFallidos >= this.cruciERRORES_POR_VIDA) {
                        this.cruciIntentosFallidos -= this.cruciERRORES_POR_VIDA;
                        this.perderVida();
                    }

                    if (fallosEl) fallosEl.textContent = this.cruciIntentosFallidos;
                }

                const totalResueltas = document.querySelectorAll('#cruci-grid-10 .celda-crucigrama.resuelta').length;
                const totalBlancas = document.querySelectorAll('#cruci-grid-10 .celda-crucigrama.blanca').length;
                if (totalBlancas === totalResueltas) {
                    this.siguienteFase(50);
                }
            });
        }
    }

    verificarPalabrasCruci(palabras, inputs) {
        palabras.forEach(palabra => {
            let actual = '';
            for (let i = 0; i < palabra.palabra.length; i++) {
                let f = palabra.fila;
                let c = palabra.col;
                if (palabra.direccion === 'horizontal') c += i;
                else f += i;
                const input = document.querySelector(`#cruci-grid-10 .celda-input[data-fila="${f}"][data-col="${c}"]`);
                if (input) actual += input.value.toUpperCase();
            }
            if (actual === palabra.palabra) {
                for (let i = 0; i < palabra.palabra.length; i++) {
                    let f = palabra.fila;
                    let c = palabra.col;
                    if (palabra.direccion === 'horizontal') c += i;
                    else f += i;
                    const celda = document.querySelector(`#cruci-grid-10 .celda-crucigrama[data-fila="${f}"][data-col="${c}"]`);
                    if (celda) celda.classList.add('resuelta');
                }
            }
        });
    }

    // ============================================================
    // FASE 6: FRASE FINAL
    // ============================================================
    renderFraseFinal(contenedor, reto) {
        contenedor.innerHTML = `
            <div class="mezcla-fase">
                <div class="fase-icono">✨</div>
                <h2 class="fase-titulo">Fase Final</h2>
                <p class="fase-frase">${reto.texto}</p>
                <input type="text" id="input-frase-final" placeholder="Escribe tu respuesta..."
                       style="max-width: 320px; margin: 1rem auto; display: block; text-align: center; font-size: 1.2rem;">
                <button class="boton" id="btn-frase-final" style="margin-top: 1rem;">Completar</button>
            </div>
        `;

        const input = document.getElementById('input-frase-final');
        const btn = document.getElementById('btn-frase-final');
        input.focus();
        input.addEventListener('keypress', e => { if (e.key === 'Enter') btn.click(); });
        btn.addEventListener('click', () => {
            const r = input.value.trim().toLowerCase();
            if (r === reto.respuesta.toLowerCase()) {
                input.style.borderColor = 'var(--color-exito)';
                this.siguienteFase(100);
            } else {
                input.style.borderColor = 'var(--color-error)';
                input.style.animation = 'shakeError 0.4s ease';
                setTimeout(() => { input.style.borderColor = ''; input.style.animation = ''; }, 1200);
                this.perderVida();
            }
        });
    }

    // ============================================================
    // UTILIDADES
    // ============================================================
    async perderVida(callback) {
        try {
            const r = await fetch('/api/perder_vida', { method: 'POST' });
            const d = await r.json();
            this.vidas = d.vidas;
            this.actualizarVidasUI();
            if (this.vidas <= 0) {
                setTimeout(() => this.derrota('Te quedaste sin vidas'), 800);
                return;
            }
            if (callback) setTimeout(callback, 600);
        } catch (e) {
            console.error(e);
            if (callback) callback();
        }
    }

    actualizarVidasUI() {
        document.querySelectorAll('#vidas-puzzle .vida').forEach((v, i) => {
            if (i >= this.vidas) v.classList.add('perdida');
        });
    }

    siguienteFase(cm) {
        this.cmAcumulado += cm;
        const cmEl = document.getElementById('cm-acumulado');
        if (cmEl) cmEl.textContent = `+${this.cmAcumulado} CM`;

        setTimeout(() => {
            this.faseActual++;
            if (this.faseActual >= this.retos.length) {
                this.completarNivel();
            } else {
                const cont = document.getElementById('mezcla-contenido');
                if (cont) {
                    cont.style.opacity = '0';
                    cont.style.transform = 'translateY(20px)';
                    setTimeout(() => {
                        this.renderizarFase();
                        cont.style.opacity = '1';
                        cont.style.transform = 'translateY(0)';
                    }, 300);
                }
            }
        }, 500);
    }

    iniciarTemporizador() {
        const elT = document.getElementById('tiempo-restante');
        const elTemp = document.getElementById('temporizador');
        this.temporizador = setInterval(() => {
            this.tiempoRestante--;
            if (elT) elT.textContent = this.tiempoRestante;
            if (elTemp) {
                if (this.tiempoRestante <= 30) {
                    elTemp.classList.add('peligro');
                    elTemp.classList.remove('advertencia');
                } else if (this.tiempoRestante <= 60) {
                    elTemp.classList.add('advertencia');
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
            window.mostrarModalCompletado();
        } catch (e) {
            console.error(e);
            window.mostrarModalCompletado();
        }
    }

    derrota(motivo) {
        clearInterval(this.temporizador);
        const c = document.getElementById('contenedor-puzzle');
        if (c) {
            c.innerHTML = `
                <div class="puzzle-derrota">
                    <div class="derrota-icono">💔</div>
                    <h2>¡Oh no!</h2>
                    <p>${motivo}</p>
                    <p class="derrota-info">Llegaste a la fase ${this.faseActual + 1} de ${this.retos.length}</p>
                    <a href="/menu" class="boton">Volver al menú</a>
                </div>
            `;
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    if (window.DATOS_NIVEL && window.DATOS_NIVEL.tipo_puzzle === 'mezcla_final') {
        window.puzzleInstance = new PuzzleMezclaFinal(window.DATOS_NIVEL, {
            vidasIniciales: window.VIDAS_INICIALES
        });
    }
});