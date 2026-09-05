import React, { useEffect, useRef } from 'react';

interface MagicParticlesProps {
  active: boolean;
  onComplete?: () => void;
}

export default function MagicParticles({ active, onComplete }: MagicParticlesProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!active) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Resize handler
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Particle class
    class Particle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      color: string;
      alpha: number;
      decay: number;
      gravity: number;
      type: 'star' | 'circle' | 'sparkle';
      rotation: number;
      rotationSpeed: number;

      constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
        
        // Explosion velocity
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 8 + 4;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed - (Math.random() * 4); // tend to shoot slightly upwards
        
        this.size = Math.random() * 7 + 4;
        
        // Magical HSL colors: golds, purples, pinks, cyans
        const colors = [
          'hsl(45, 100%, 60%)',  // Gold
          'hsl(280, 100%, 75%)', // Purple
          'hsl(330, 100%, 70%)', // Pink
          'hsl(180, 100%, 65%)', // Cyan
          'hsl(30, 100%, 65%)',  // Warm Orange
        ];
        this.color = colors[Math.floor(Math.random() * colors.length)];
        
        this.alpha = 1.0;
        this.decay = Math.random() * 0.012 + 0.008; // slightly slower fade for more magic
        this.gravity = 0.12;
        
        const types: Array<'star' | 'circle' | 'sparkle'> = ['star', 'circle', 'sparkle'];
        this.type = types[Math.floor(Math.random() * types.length)];
        
        this.rotation = Math.random() * Math.PI * 2;
        this.rotationSpeed = (Math.random() - 0.5) * 0.15;
      }

      update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += this.gravity;
        this.vx *= 0.98; // friction
        this.vy *= 0.98;
        this.alpha -= this.decay;
        this.rotation += this.rotationSpeed;
      }

      draw(c: CanvasRenderingContext2D) {
        c.save();
        c.globalAlpha = this.alpha;
        c.translate(this.x, this.y);
        c.rotate(this.rotation);
        
        // Draw shadow/glow
        c.shadowBlur = 12;
        c.shadowColor = this.color;
        c.fillStyle = this.color;
        
        if (this.type === 'star') {
          // Draw a 5-pointed star
          c.beginPath();
          for (let i = 0; i < 5; i++) {
            c.lineTo(Math.cos((18 + i * 72) * Math.PI / 180) * this.size,
                     Math.sin((18 + i * 72) * Math.PI / 180) * this.size);
            c.lineTo(Math.cos((54 + i * 72) * Math.PI / 180) * (this.size / 2.2),
                     Math.sin((54 + i * 72) * Math.PI / 180) * (this.size / 2.2));
          }
          c.closePath();
          c.fill();
        } else if (this.type === 'sparkle') {
          // Draw a 4-point star/sparkle
          c.beginPath();
          c.moveTo(0, -this.size * 1.4);
          c.quadraticCurveTo(0, 0, this.size * 1.4, 0);
          c.quadraticCurveTo(0, 0, 0, this.size * 1.4);
          c.quadraticCurveTo(0, 0, -this.size * 1.4, 0);
          c.quadraticCurveTo(0, 0, 0, -this.size * 1.4);
          c.closePath();
          c.fill();
        } else {
          // Draw a glowing circle
          c.beginPath();
          c.arc(0, 0, this.size / 2.2, 0, Math.PI * 2);
          c.closePath();
          c.fill();
        }
        
        c.restore();
      }
    }

    const particles: Particle[] = [];
    
    // Create a burst of particles in the center of the screen
    const burstX = window.innerWidth / 2;
    const burstY = window.innerHeight / 2 - 50; // slightly above absolute center
    
    // Add 130 particles in the center
    for (let i = 0; i < 130; i++) {
      particles.push(new Particle(burstX, burstY));
    }

    // Add celebration bursts from the bottom corners
    for (let i = 0; i < 35; i++) {
      const pLeft = new Particle(0, window.innerHeight);
      pLeft.vx = Math.random() * 14 + 6;
      pLeft.vy = -(Math.random() * 16 + 12);
      particles.push(pLeft);

      const pRight = new Particle(window.innerWidth, window.innerHeight);
      pRight.vx = -(Math.random() * 14 + 6);
      pRight.vy = -(Math.random() * 16 + 12);
      particles.push(pRight);
    }

    let animationFrameId: number;

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Randomly add a few trailing fairy dust particles in the upper region
      if (particles.length < 300 && Math.random() < 0.25) {
        const randomX = Math.random() * canvas.width;
        const randomY = Math.random() * (canvas.height * 0.7);
        const p = new Particle(randomX, randomY);
        p.vx = (Math.random() - 0.5) * 1.5;
        p.vy = Math.random() * 0.8 + 0.3;
        p.alpha = 0.8;
        p.decay = 0.015;
        particles.push(p);
      }

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.update();
        if (p.alpha <= 0) {
          particles.splice(i, 1);
        } else {
          p.draw(ctx);
        }
      }

      if (particles.length > 0) {
        animationFrameId = requestAnimationFrame(animate);
      } else {
        if (onComplete) onComplete();
      }
    };

    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationFrameId);
    };
  }, [active, onComplete]);

  if (!active) return null;

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        pointerEvents: 'none',
        zIndex: 9999,
      }}
    />
  );
}
