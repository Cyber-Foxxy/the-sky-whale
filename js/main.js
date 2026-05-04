const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const startBtn = document.getElementById("startBtn");
const restartBtn = document.getElementById("restartBtn");
const soundToggle = document.getElementById("soundToggle");

const scoreOutput = document.getElementById("scoreOutput");
const livesOutput = document.getElementById("livesOutput");
const levelOutput = document.getElementById("levelOutput");
const messageOutput = document.getElementById("messageOutput");

const keys = {};
let relicTemplates = [];
let hazardTemplates = [];

let gameState = "start";
let score = 0;
let lives = 3;
let level = 1;
let frame = 0;
let relics = [];
let hazards = [];
let particles = [];
let bubbles = [];
let stars = [];

class Player {
  constructor() {
    this.x = canvas.width / 2;
    this.y = canvas.height / 2 + 80;
    this.radius = 22;
    this.speed = 4.2;
    this.invincibleTimer = 0;
  }

  reset() {
    this.x = canvas.width / 2;
    this.y = canvas.height / 2 + 80;
    this.invincibleTimer = 90;
  }

  update() {
    let dx = 0;
    let dy = 0;

    if (keys.ArrowLeft || keys.a || keys.A) dx -= 1;
    if (keys.ArrowRight || keys.d || keys.D) dx += 1;
    if (keys.ArrowUp || keys.w || keys.W) dy -= 1;
    if (keys.ArrowDown || keys.s || keys.S) dy += 1;

    if (dx !== 0 || dy !== 0) {
      const length = Math.hypot(dx, dy);
      dx /= length;
      dy /= length;
    }

    this.x += dx * this.speed;
    this.y += dy * this.speed;

    this.x = clamp(this.x, this.radius + 10, canvas.width - this.radius - 10);
    this.y = clamp(this.y, this.radius + 10, canvas.height - this.radius - 10);

    if (this.invincibleTimer > 0) this.invincibleTimer--;
  }

  draw() {
    ctx.save();
    ctx.translate(this.x, this.y);

    if (this.invincibleTimer > 0 && frame % 10 < 5) {
      ctx.globalAlpha = 0.55;
    }

    // Zephyr-style pilot body
    ctx.fillStyle = "#6f7f98";
    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    ctx.fill();

    // muzzle
    ctx.fillStyle = "#d6b58a";
    ctx.beginPath();
    ctx.ellipse(0, 8, 13, 9, 0, 0, Math.PI * 2);
    ctx.fill();

    // pilot goggles
    ctx.strokeStyle = "#141414";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(-8, -5, 6, 0, Math.PI * 2);
    ctx.arc(8, -5, 6, 0, Math.PI * 2);
    ctx.stroke();

    // ears
    ctx.fillStyle = "#59687f";
    ctx.beginPath();
    ctx.moveTo(-16, -16);
    ctx.lineTo(-29, -26);
    ctx.lineTo(-20, -5);
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(16, -16);
    ctx.lineTo(29, -26);
    ctx.lineTo(20, -5);
    ctx.fill();

    // brass scarf / heroic mark
    ctx.fillStyle = "#ffd36b";
    ctx.fillRect(-18, 20, 36, 8);

    ctx.restore();
  }
}

class Relic {
  constructor(template) {
    this.template = template;
    this.name = template.name;
    this.value = template.value;
    this.color = template.color;
    this.radius = randomRange(12, 18);
    this.x = randomRange(50, canvas.width - 50);
    this.y = randomRange(70, canvas.height - 50);
    this.angle = Math.random() * Math.PI * 2;
    this.floatOffset = Math.random() * 100;
  }

  update() {
    this.angle += 0.035;
  }

  draw() {
    const pulse = Math.sin(frame * 0.05 + this.floatOffset) * 4;
    ctx.save();
    ctx.translate(this.x, this.y + pulse);
    ctx.rotate(this.angle);

    ctx.shadowColor = this.color;
    ctx.shadowBlur = 18;
    ctx.strokeStyle = this.color;
    ctx.fillStyle = "rgba(255,255,255,0.12)";
    ctx.lineWidth = 3;

    if (this.template.type === "gear") {
      drawGear(0, 0, this.radius, this.color);
    } else if (this.template.type === "heart") {
      drawHeart(0, 0, this.radius, this.color);
    } else if (this.template.type === "prism") {
      drawDiamond(0, 0, this.radius, this.color);
    } else {
      ctx.beginPath();
      ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    ctx.restore();
  }
}

class Hazard {
  constructor(template, index) {
    this.template = template;
    this.name = template.name;
    this.radius = template.radius;
    this.x = randomRange(80, canvas.width - 80);
    this.y = randomRange(90, canvas.height - 80);
    this.vx = randomRange(-template.speed, template.speed) || template.speed;
    this.vy = randomRange(-template.speed, template.speed) || -template.speed;
    this.phase = index * 70;
  }

  update() {
    this.x += this.vx + Math.sin((frame + this.phase) * 0.018) * 0.4;
    this.y += this.vy + Math.cos((frame + this.phase) * 0.02) * 0.4;

    if (this.x < this.radius || this.x > canvas.width - this.radius) this.vx *= -1;
    if (this.y < this.radius + 30 || this.y > canvas.height - this.radius) this.vy *= -1;
  }

  draw() {
    const wobble = Math.sin(frame * 0.07 + this.phase) * 5;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.shadowColor = "#a855f7";
    ctx.shadowBlur = 25;

    const grad = ctx.createRadialGradient(0, 0, 4, 0, 0, this.radius + 12 + wobble);
    grad.addColorStop(0, "rgba(248, 113, 255, 0.9)");
    grad.addColorStop(0.45, "rgba(126, 34, 206, 0.75)");
    grad.addColorStop(1, "rgba(40, 10, 70, 0.05)");

    ctx.fillStyle = grad;
    ctx.beginPath();
    for (let i = 0; i < 9; i++) {
      const a = (Math.PI * 2 / 9) * i;
      const r = this.radius + Math.sin(frame * 0.06 + i) * 6;
      const px = Math.cos(a) * r;
      const py = Math.sin(a) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }
}

class Particle {
  constructor(x, y, color) {
    this.x = x;
    this.y = y;
    this.vx = randomRange(-2.5, 2.5);
    this.vy = randomRange(-2.5, 2.5);
    this.life = 40;
    this.color = color;
    this.radius = randomRange(2, 5);
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.life--;
  }

  draw() {
    ctx.globalAlpha = Math.max(this.life / 40, 0);
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

class BubblePulse {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.radius = 10;
    this.life = 48;
  }

  update() {
    this.radius += 6;
    this.life--;
  }

  draw() {
    ctx.save();
    ctx.globalAlpha = this.life / 48;
    ctx.strokeStyle = "#9ffcff";
    ctx.lineWidth = 4;
    ctx.shadowColor = "#9ffcff";
    ctx.shadowBlur = 20;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

const player = new Player();

function setupStars() {
  stars = [];
  for (let i = 0; i < 85; i++) {
    stars.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height * 0.62,
      size: Math.random() * 2 + 0.4,
      drift: Math.random() * 0.3 + 0.05
    });
  }
}

async function loadData() {
  try {
    const relicResponse = await fetch("data/relics.json");
    const hazardResponse = await fetch("data/hazards.json");
    relicTemplates = await relicResponse.json();
    hazardTemplates = await hazardResponse.json();
  } catch (error) {
    console.warn("JSON loading failed. Using backup data.", error);
    relicTemplates = [
      { name: "Sun-Forged Gear Spark", type: "gear", value: 15, color: "#ffd36b" },
      { name: "Obsidian Prism Glimmer", type: "prism", value: 20, color: "#a78bfa" },
      { name: "Stone Heart Pulse", type: "heart", value: 25, color: "#fb7185" }
    ];
    hazardTemplates = [
      { name: "Odium Shadow", radius: 24, speed: 1.3 },
      { name: "Purple Rift", radius: 28, speed: 1.1 }
    ];
  }

  setupStars();
  resetGame();
  requestAnimationFrame(gameLoop);
}

function resetGame() {
  score = 0;
  lives = 3;
  level = 1;
  gameState = "start";
  frame = 0;
  player.reset();
  spawnRelics();
  spawnHazards();
  particles = [];
  bubbles = [];
  updateUI("Press Start Mission");
}

function startGame() {
  if (gameState === "won" || gameState === "lost") resetGame();
  gameState = "playing";
  updateUI("Collect relic power!");
}

function spawnRelics() {
  relics = [];
  const amount = 5 + level;
  for (let i = 0; i < amount; i++) {
    const template = relicTemplates[i % relicTemplates.length];
    relics.push(new Relic(template));
  }
}

function spawnHazards() {
  hazards = [];
  const amount = Math.min(2 + level, 7);
  for (let i = 0; i < amount; i++) {
    const template = hazardTemplates[i % hazardTemplates.length];
    hazards.push(new Hazard(template, i));
  }
}

function updateGame() {
  if (gameState !== "playing") return;

  player.update();

  relics.forEach(relic => relic.update());
  hazards.forEach(hazard => hazard.update());
  particles.forEach(p => p.update());
  bubbles.forEach(b => b.update());

  particles = particles.filter(p => p.life > 0);
  bubbles = bubbles.filter(b => b.life > 0);

  checkRelicCollisions();
  checkHazardCollisions();
  checkBubbleHazardCollisions();

  if (relics.length === 0) {
    level++;
    if (level > 3) level = 3;
    spawnRelics();
    spawnHazards();
    updateUI("More relics appeared. Difficulty increased!");
  }

  if (score >= 120) {
    gameState = "won";
    updateUI("Victory! The Sky Whale is stabilized!");
  }
}

function checkRelicCollisions() {
  for (let i = relics.length - 1; i >= 0; i--) {
    const relic = relics[i];
    if (distance(player.x, player.y, relic.x, relic.y) < player.radius + relic.radius) {
      score += relic.value;
      createBurst(relic.x, relic.y, relic.color, 16);
      playTone(620, 0.08);
      updateUI(`Collected: ${relic.name}`);
      relics.splice(i, 1);
    }
  }
}

function checkHazardCollisions() {
  if (player.invincibleTimer > 0) return;

  for (const hazard of hazards) {
    if (distance(player.x, player.y, hazard.x, hazard.y) < player.radius + hazard.radius - 4) {
      lives--;
      score = Math.max(0, score - 10);
      createBurst(player.x, player.y, "#a855f7", 22);
      playTone(140, 0.15);
      player.reset();

      if (lives <= 0) {
        gameState = "lost";
        updateUI("Mission failed. Odium overwhelmed the ship.");
      } else {
        updateUI("Hit by an Odium shadow! Moose says: stay focused!");
      }
      break;
    }
  }
}

function checkBubbleHazardCollisions() {
  for (const bubble of bubbles) {
    for (const hazard of hazards) {
      if (distance(bubble.x, bubble.y, hazard.x, hazard.y) < bubble.radius + hazard.radius) {
        hazard.vx *= -1.15;
        hazard.vy *= -1.15;
        createBurst(hazard.x, hazard.y, "#9ffcff", 8);
      }
    }
  }
}

function drawScene() {
  drawSky();
  drawSkyWhale();
  drawRelicMeter();

  relics.forEach(relic => relic.draw());
  hazards.forEach(hazard => hazard.draw());
  bubbles.forEach(bubble => bubble.draw());
  particles.forEach(particle => particle.draw());
  player.draw();

  if (gameState === "start") {
    drawOverlay("Sky Whale Relic Run", "Press Start Mission to begin");
  }

  if (gameState === "won") {
    drawOverlay("The Sky Whale Stabilized!", "You collected enough relic power.");
  }

  if (gameState === "lost") {
    drawOverlay("Mission Failed", "Restart and try again.");
  }
}

function drawSky() {
  const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
  grad.addColorStop(0, "#111339");
  grad.addColorStop(0.48, "#36204d");
  grad.addColorStop(1, "#0b1724");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (const star of stars) {
    star.x -= star.drift;
    if (star.x < 0) star.x = canvas.width;
    ctx.fillStyle = "rgba(255, 245, 196, 0.85)";
    ctx.fillRect(star.x, star.y, star.size, star.size);
  }

  // magical aurora ribbons
  ctx.save();
  ctx.globalAlpha = 0.25;
  ctx.strokeStyle = "#8df7ff";
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (let x = 0; x <= canvas.width; x += 20) {
    const y = 95 + Math.sin(x * 0.012 + frame * 0.018) * 25;
    if (x === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();

  ctx.strokeStyle = "#ffd36b";
  ctx.beginPath();
  for (let x = 0; x <= canvas.width; x += 20) {
    const y = 145 + Math.cos(x * 0.01 + frame * 0.014) * 20;
    if (x === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.restore();
}

function drawSkyWhale() {
  ctx.save();
  const bob = Math.sin(frame * 0.025) * 5;
  ctx.translate(0, bob);

  // ship shadow body
  ctx.fillStyle = "rgba(30, 18, 24, 0.75)";
  ctx.beginPath();
  ctx.ellipse(480, 350, 300, 82, 0, 0, Math.PI * 2);
  ctx.fill();

  // brass body
  const bodyGrad = ctx.createLinearGradient(170, 300, 790, 400);
  bodyGrad.addColorStop(0, "#6b3f25");
  bodyGrad.addColorStop(0.45, "#b97838");
  bodyGrad.addColorStop(1, "#4a2d28");
  ctx.fillStyle = bodyGrad;
  ctx.beginPath();
  ctx.ellipse(480, 330, 285, 70, 0, 0, Math.PI * 2);
  ctx.fill();

  // glass eye
  ctx.fillStyle = "#9ffcff";
  ctx.shadowColor = "#9ffcff";
  ctx.shadowBlur = 18;
  ctx.beginPath();
  ctx.arc(690, 315, 28, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  // top deck
  ctx.fillStyle = "#2d1d28";
  ctx.fillRect(260, 240, 350, 30);

  // mast / dorsal fin
  ctx.fillStyle = "#cab083";
  ctx.beginPath();
  ctx.moveTo(430, 240);
  ctx.lineTo(500, 120);
  ctx.lineTo(575, 240);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = "#3d291f";
  ctx.lineWidth = 4;
  ctx.stroke();

  // tail
  ctx.fillStyle = "#87562f";
  ctx.beginPath();
  ctx.moveTo(205, 325);
  ctx.lineTo(100, 260 + Math.sin(frame * 0.08) * 12);
  ctx.lineTo(110, 330);
  ctx.lineTo(100, 405 + Math.sin(frame * 0.08) * 12);
  ctx.closePath();
  ctx.fill();

  // glowing portholes
  for (let i = 0; i < 8; i++) {
    ctx.fillStyle = "#ffd36b";
    ctx.beginPath();
    ctx.arc(310 + i * 45, 340, 8, 0, Math.PI * 2);
    ctx.fill();
  }

  // steam
  ctx.globalAlpha = 0.22;
  ctx.fillStyle = "#ffffff";
  for (let i = 0; i < 5; i++) {
    const sx = 250 + i * 85;
    const sy = 405 + Math.sin(frame * 0.03 + i) * 10;
    ctx.beginPath();
    ctx.arc(sx, sy, 18 + Math.sin(frame * 0.04 + i) * 6, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  ctx.restore();
}

function drawRelicMeter() {
  ctx.save();
  ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
  ctx.fillRect(24, 20, 240, 22);

  ctx.fillStyle = "#ffd36b";
  ctx.fillRect(24, 20, Math.min(score / 120, 1) * 240, 22);

  ctx.strokeStyle = "#fff8df";
  ctx.lineWidth = 2;
  ctx.strokeRect(24, 20, 240, 22);

  ctx.fillStyle = "#fff8df";
  ctx.font = "14px Trebuchet MS";
  ctx.fillText("Relic Power", 30, 36);
  ctx.restore();
}

function drawOverlay(title, subtitle) {
  ctx.save();
  ctx.fillStyle = "rgba(7, 6, 15, 0.72)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.textAlign = "center";
  ctx.fillStyle = "#ffe7a1";
  ctx.font = "bold 52px Trebuchet MS";
  ctx.fillText(title, canvas.width / 2, canvas.height / 2 - 20);

  ctx.fillStyle = "#ffffff";
  ctx.font = "24px Trebuchet MS";
  ctx.fillText(subtitle, canvas.width / 2, canvas.height / 2 + 28);
  ctx.restore();
}

function createBurst(x, y, color, amount) {
  for (let i = 0; i < amount; i++) {
    particles.push(new Particle(x, y, color));
  }
}

function drawGear(x, y, r, color) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  for (let i = 0; i < 10; i++) {
    const a = (Math.PI * 2 / 10) * i;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * (r - 3), Math.sin(a) * (r - 3));
    ctx.lineTo(Math.cos(a) * (r + 8), Math.sin(a) * (r + 8));
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x, y, r / 2.4, 0, Math.PI * 2);
  ctx.stroke();
}

function drawDiamond(x, y, r, color) {
  ctx.fillStyle = "rgba(255,255,255,0.15)";
  ctx.strokeStyle = color;
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.lineTo(x + r, y);
  ctx.lineTo(x, y + r);
  ctx.lineTo(x - r, y);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

function drawHeart(x, y, r, color) {
  ctx.fillStyle = "rgba(255,255,255,0.15)";
  ctx.strokeStyle = color;
  ctx.beginPath();
  ctx.moveTo(x, y + r / 2);
  ctx.bezierCurveTo(x - r * 1.4, y - r / 4, x - r / 2, y - r * 1.2, x, y - r / 2);
  ctx.bezierCurveTo(x + r / 2, y - r * 1.2, x + r * 1.4, y - r / 4, x, y + r / 2);
  ctx.fill();
  ctx.stroke();
}

function updateUI(message) {
  scoreOutput.textContent = score;
  livesOutput.textContent = lives;
  levelOutput.textContent = level;
  messageOutput.textContent = message;
}

function gameLoop() {
  frame++;
  updateGame();
  drawScene();
  requestAnimationFrame(gameLoop);
}

function distance(x1, y1, x2, y2) {
  return Math.hypot(x2 - x1, y2 - y1);
}

function randomRange(min, max) {
  return Math.random() * (max - min) + min;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function playTone(frequency, duration) {
  if (!soundToggle.checked) return;

  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return;

  const audioCtx = new AudioContext();
  const oscillator = audioCtx.createOscillator();
  const gain = audioCtx.createGain();

  oscillator.frequency.value = frequency;
  oscillator.type = "sine";
  gain.gain.value = 0.08;

  oscillator.connect(gain);
  gain.connect(audioCtx.destination);

  oscillator.start();
  oscillator.stop(audioCtx.currentTime + duration);
}

window.addEventListener("keydown", event => {
  keys[event.key] = true;

  // Stops arrow keys and space from moving the browser page while playing.
  if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(event.key)) {
    event.preventDefault();
  }
});

window.addEventListener("keyup", event => {
  keys[event.key] = false;
});

canvas.addEventListener("click", event => {
  if (gameState !== "playing") return;

  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const x = (event.clientX - rect.left) * scaleX;
  const y = (event.clientY - rect.top) * scaleY;

  bubbles.push(new BubblePulse(x, y));
  createBurst(x, y, "#9ffcff", 10);
  playTone(420, 0.08);
  updateUI("Bubble-pipe pulse released!");
});

startBtn.addEventListener("click", startGame);
restartBtn.addEventListener("click", resetGame);

loadData();
