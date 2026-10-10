/* ============================================================
   NEUROLAB - PUZZLE: MEZCLA FINAL (Nivel 10)
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

        this.inicializarUI();
    }

    inicializarUI() {
        const contenedor = document.getElementById('contenedor-puzzle');
        contenedor.innerHTML = `
            <div class="puzzle-mezcla">
                <div class="puzzle-header">
                    <span class="puzzle-progreso">Fase ${this.faseActual + 1} / ${this.retos.length}</span>
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
        this.iniciarTemporizador();
    }

    actualizarBarra() {
        const porcentaje = (this.faseActual / this.retos.length) * 100;
        const barra = document.getElementById('barra-puzzle');
        if (barra) barra.style.width = `${porcentaje}%`;
        const prog = document.querySelector('.puzzle-progreso');
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

    // FASE 1: COMPLETAR FRASE
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

    // FASE 2: V/F
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

    // FASE 3: SOPA CORTA
    renderSopaCorta(contenedor, reto) {
        const size = 8;
        const grid = Array(size).fill(null).map(() => Array(size).fill(''));
        const palabras = reto.palabras;
        const posiciones = {};

        palabras.forEach(palabra => {
            let colocada = false, intentos = 0;
            while (!colocada && intentos < 100) {
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
                    posiciones[palabra] = celdas;
                    colocada = true;
                }
            }
        });

        const letras = 'ABCDEFGHIJKLMNÑOPQRSTUVWXYZ';
        for (let i = 0; i < size; i++)
            for (let j = 0; j < size; j++)
                if (!grid[i][j]) grid[i][j] = letras[Math.floor(Math.random() * letras.length)];

        this.sopaState = { grid, palabras, encontradas: new Set(), seleccionando: false, celdas: [], inicio: null };

        contenedor.innerHTML = `
            <div class="mezcla-fase">
                <div class="fase-icono">🔍</div>
                <h2 class="fase-titulo">Fase 3: Sopa de letras</h2>
                <p class="fase-instruccion">Encuentra: ${palabras.join(' · ')}</p>
                <div class="sopa-corta-grid" id="sopa-corta" style="grid-template-columns: repeat(${size}, 1fr);">
                    ${grid.map((fila, f) => fila.map((letra, c) =>
                        `<div class="celda-sopa-corta" data-fila="${f}" data-col="${c}">${letra}</div>`
                    ).join('')).join('')}
                </div>
            </div>
        `;

        const gridEl = document.getElementById('sopa-corta');

        const iniciar = (e) => {
            const t = (e.touches ? e.touches[0] : e).target;
            if (!t.classList || !t.classList.contains('celda-sopa-corta')) return;
            this.sopaState.seleccionando = true;
            this.sopaState.inicio = { f: +t.dataset.fila, c: +t.dataset.col, el: t };
            this.sopaState.celdas = [this.sopaState.inicio];
            this.actualizarSelSopa();
        };

        const extender = (e) => {
            if (!this.sopaState.seleccionando) return;
            const t = (e.touches ? e.touches[0] : e).target;
            if (!t.classList || !t.classList.contains('celda-sopa-corta')) return;
            const f = +t.dataset.fila, c = +t.dataset.col;
            const df = f - this.sopaState.inicio.f, dc = c - this.sopaState.inicio.c;
            if (df !== 0 && dc !== 0) return;
            const pasos = Math.max(Math.abs(df), Math.abs(dc));
            const sf = Math.sign(df), sc = Math.sign(dc);
            this.sopaState.celdas = [];
            for (let i = 0; i <= pasos; i++) {
                const ff = this.sopaState.inicio.f + sf * i;
                const cc = this.sopaState.inicio.c + sc * i;
                const el = document.querySelector(`.celda-sopa-corta[data-fila="${ff}"][data-col="${cc}"]`);
                if (el) this.sopaState.celdas.push({ f: ff, c: cc, el });
            }
            this.actualizarSelSopa();
        };

        const terminar = () => {
            if (!this.sopaState.seleccionando) return;
            this.sopaState.seleccionando = false;
            const palabra = this.sopaState.celdas.map(c => this.sopaState.grid[c.f][c.c]).join('');
            const inv = palabra.split('').reverse().join('');
            const enc = this.sopaState.palabras.find(p => !this.sopaState.encontradas.has(p) && (p === palabra || p === inv));
            if (enc) {
                this.sopaState.encontradas.add(enc);
                this.sopaState.celdas.forEach(c => { c.el.classList.remove('seleccionada'); c.el.classList.add('encontrada-sopa'); });
                if (this.sopaState.encontradas.size >= this.sopaState.palabras.length) this.siguienteFase(80);
            } else {
                this.sopaState.celdas.forEach(c => c.el.classList.remove('seleccionada'));
                this.perderVida();
            }
            this.sopaState.celdas = [];
        };

        gridEl.addEventListener('mousedown', iniciar);
        gridEl.addEventListener('mouseover', extender);
        document.addEventListener('mouseup', terminar);
        gridEl.addEventListener('touchstart', e => { e.preventDefault(); iniciar(e); });
        gridEl.addEventListener('touchmove', e => { e.preventDefault(); extender(e); });
        gridEl.addEventListener('touchend', e => { e.preventDefault(); terminar(); });
    }

    actualizarSelSopa() {
        document.querySelectorAll('.celda-sopa-corta.seleccionada').forEach(el => el.classList.remove('seleccionada'));
        this.sopaState.celdas.forEach(c => c.el.classList.add('seleccionada'));
    }

    // FASE 4: MEMORAMA
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

        this.memState = { volt: [], enc: 0, total: reto.pares.length, bloqueado: false };

        contenedor.innerHTML = `
            <div class="mezcla-fase">
                <div class="fase-icono">🎴</div>
                <h2 class="fase-titulo">Fase 4: Memorama</h2>
                <p class="fase-instruccion">Empareja término con definición.</p>
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
                    this.memState.volt = [];
                    this.memState.bloqueado = false;
                    if (this.memState.enc >= this.memState.total) this.siguienteFase(80);
                }, 600);
            } else {
                setTimeout(() => {
                    c1.classList.add('incorrecta');
                    c2.classList.add('incorrecta');
                    this.perderVida(() => {
                        c1.classList.remove('volteada', 'incorrecta');
                        c2.classList.remove('volteada', 'incorrecta');
                        this.memState.volt = [];
                        this.memState.bloqueado = false;
                    });
                }, 800);
            }
        }
    }

    // FASE 5: CRUCIGRAMA
    renderCrucigrama(contenedor, reto) {
        const palabra = reto.palabra;
        contenedor.innerHTML = `
            <div class="mezcla-fase">
                <div class="fase-icono">🧩</div>
                <h2 class="fase-titulo">Fase 5: Crucigrama</h2>
                <p class="fase-instruccion"><strong>Pista:</strong> ${reto.pista}</p>
                <div class="crucigrama-mini" style="grid-template-columns: repeat(${palabra.length}, 1fr);">
                    ${palabra.split('').map((_, i) => `
                        <div class="celda-crucigrama-mini">
                            <input type="text" maxlength="1" class="input-crucigrama-mini" data-indice="${i}" autocomplete="off">
                        </div>
                    `).join('')}
                </div>
                <button class="boton" id="btn-verificar-cruci" style="margin-top: 1rem;">Verificar</button>
            </div>
        `;

        const inputs = document.querySelectorAll('.input-crucigrama-mini');
        inputs.forEach((input, i) => {
            input.addEventListener('input', (e) => {
                e.target.value = e.target.value.toUpperCase();
                if (e.target.value && i < inputs.length - 1) inputs[i + 1].focus();
            });
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Backspace' && !e.target.value && i > 0) inputs[i - 1].focus();
            });
        });

        document.getElementById('btn-verificar-cruci').addEventListener('click', () => {
            const ing = Array.from(inputs).map(i => i.value.toUpperCase()).join('');
            if (ing === palabra) {
                inputs.forEach(i => i.parentElement.classList.add('resuelta'));
                this.siguienteFase(50);
            } else {
                inputs.forEach(i => {
                    i.parentElement.classList.add('incorrecta');
                    setTimeout(() => i.parentElement.classList.remove('incorrecta'), 1200);
                });
                this.perderVida();
            }
        });
    }

    // FASE 6: FRASE FINAL
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

    // UTILIDADES
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
            window.location.href = `/recompensa/${this.nivel}`;
        } catch (e) {
            console.error(e);
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
        new PuzzleMezclaFinal(window.DATOS_NIVEL, {
            vidasIniciales: window.VIDAS_INICIALES
        });
    }
});