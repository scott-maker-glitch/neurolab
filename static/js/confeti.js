/* ============================================================
   NEUROLAB - CONFETI
   Efecto de partículas al completar un nivel
   ============================================================ */

(function() {
    const canvas = document.getElementById('confeti-canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    window.addEventListener('resize', () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    });

    // Colores temáticos de NeuroLab
    const colores = [
        '#8b5cf6', // violeta
        '#22d3ee', // cian
        '#34d399', // verde
        '#fbbf24', // amarillo
        '#f87171', // coral
        '#a78bfa', // violeta claro
        '#67e8f9'  // cian claro
    ];

    const formas = ['circle', 'square', 'triangle'];

    class Particula {
        constructor() {
            this.x = Math.random() * canvas.width;
            this.y = Math.random() * -canvas.height;
            this.size = Math.random() * 10 + 5;
            this.color = colores[Math.floor(Math.random() * colores.length)];
            this.forma = formas[Math.floor(Math.random() * formas.length)];
            this.velocidadY = Math.random() * 3 + 2;
            this.velocidadX = Math.random() * 2 - 1;
            this.rotacion = Math.random() * Math.PI * 2;
            this.velocidadRotacion = Math.random() * 0.2 - 0.1;
            this.opacidad = 1;
        }

        actualizar() {
            this.y += this.velocidadY;
            this.x += this.velocidadX;
            this.rotacion += this.velocidadRotacion;

            // Gravedad suave
            this.velocidadY += 0.05;

            // Desvanecer al final
            if (this.y > canvas.height * 0.7) {
                this.opacidad -= 0.01;
            }

            return this.y < canvas.height + 20 && this.opacidad > 0;
        }

        dibujar() {
            ctx.save();
            ctx.globalAlpha = this.opacidad;
            ctx.translate(this.x, this.y);
            ctx.rotate(this.rotacion);
            ctx.fillStyle = this.color;

            if (this.forma === 'circle') {
                ctx.beginPath();
                ctx.arc(0, 0, this.size / 2, 0, Math.PI * 2);
                ctx.fill();
            } else if (this.forma === 'square') {
                ctx.fillRect(-this.size / 2, -this.size / 2, this.size, this.size);
            } else {
                ctx.beginPath();
                ctx.moveTo(0, -this.size / 2);
                ctx.lineTo(this.size / 2, this.size / 2);
                ctx.lineTo(-this.size / 2, this.size / 2);
                ctx.closePath();
                ctx.fill();
            }

            ctx.restore();
        }
    }

    const particulas = [];
    const cantidadParticulas = 180;

    // Crear partículas en oleadas
    let contador = 0;
    const intervalo = setInterval(() => {
        for (let i = 0; i < 15; i++) {
            if (particulas.length < cantidadParticulas) {
                particulas.push(new Particula());
            }
        }
        contador++;
        if (contador > 12) clearInterval(intervalo);
    }, 100);

    function animar() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        for (let i = particulas.length - 1; i >= 0; i--) {
            const p = particulas[i];
            if (p.actualizar()) {
                p.dibujar();
            } else {
                particulas.splice(i, 1);
            }
        }

        if (particulas.length > 0 || contador <= 12) {
            requestAnimationFrame(animar);
        }
    }

    animar();
})();