import type { BookingRecord } from "./booking-record";
import { rupees } from "./booking";

type Rect = { x: number; y: number; width: number; height: number };

/** Contain an artwork image without changing its ratio or cropping its edges. */
export function containedArtworkRect(
  sourceWidth: number,
  sourceHeight: number,
  x: number,
  y: number,
  width: number,
  height: number,
): Rect {
  const ratio = Math.min(width / sourceWidth, height / sourceHeight);
  const fittedWidth = sourceWidth * ratio;
  const fittedHeight = sourceHeight * ratio;
  return {
    x: x + (width - fittedWidth) / 2,
    y: y + (height - fittedHeight) / 2,
    width: fittedWidth,
    height: fittedHeight,
  };
}

function coverRect(sourceWidth: number, sourceHeight: number, x: number, y: number, width: number, height: number, position = "50% 50%"): Rect {
  const ratio = Math.max(width / sourceWidth, height / sourceHeight);
  const fittedWidth = sourceWidth * ratio;
  const fittedHeight = sourceHeight * ratio;
  const [horizontal = "50%", vertical = "50%"] = position.split(/\s+/);
  const xPercent = Number.parseFloat(horizontal) / 100 || 0;
  const yPercent = Number.parseFloat(vertical) / 100 || 0;
  return {
    x: x + (width - fittedWidth) * xPercent,
    y: y + (height - fittedHeight) * yPercent,
    width: fittedWidth,
    height: fittedHeight,
  };
}

/** Draw the immutable booking snapshot as a portable ticket image. */
export async function ticketImage(b: BookingRecord, qr: string) {
  if (b.status !== "confirmed" || !qr) throw new Error("A confirmed ticket and QR code are required");
  const load = async (src: string) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.decoding = "async";
    img.src = src;
    await img.decode();
    return img;
  };
  const artworkSource = b.snapshot.movie.backdrop || b.snapshot.movie.poster;
  const [logo, code, artwork] = await Promise.all([
    load("/assets/movieverse-logo.png"),
    load(qr),
    load(artworkSource).catch(() => null),
  ]);
  const canvas = document.createElement("canvas");
  canvas.width = 900;
  canvas.height = 1350;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Ticket canvas is unavailable");

  const background = ctx.createLinearGradient(0, 0, 900, 1350);
  background.addColorStop(0, "#382022");
  background.addColorStop(0.45, "#17121e");
  background.addColorStop(1, "#2a173d");
  ctx.fillStyle = background;
  ctx.beginPath();
  ctx.roundRect(4, 4, 892, 1342, 32);
  ctx.fill();
  const border = ctx.createLinearGradient(0, 0, 900, 1350);
  border.addColorStop(0, "#ff9c45");
  border.addColorStop(1, "#aa70ee");
  ctx.strokeStyle = border;
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.drawImage(logo, 45, 38, 320, (320 * 117) / 649);

  const text = (value: string, y: number, size = 21, color = "#ded8e3", left = 45) => {
    ctx.font = `${size}px sans-serif`;
    ctx.fillStyle = color;
    ctx.fillText(value, left, y);
  };
  text("YOUR UNIVERSE. YOUR MOVIE. YOUR SEAT.", 128, 15);
  text(b.status.toUpperCase(), 79, 18, "#a6edc5", 655);

  const hero = { x: 40, y: 160, width: 820, height: 350 };
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(hero.x, hero.y, hero.width, hero.height, 22);
  ctx.clip();
  ctx.fillStyle = "#0c0b12";
  ctx.fillRect(hero.x, hero.y, hero.width, hero.height);
  const titleX = 45;
  const titleWidth = 770;
  const formatY = 492;
  if (artwork) {
    const position = b.snapshot.movie.backdropPosition || "50% 50%";
    const blurred = coverRect(artwork.width, artwork.height, hero.x, hero.y, hero.width, hero.height, position);
    ctx.save();
    ctx.filter = "blur(24px) brightness(.45) saturate(.85)";
    ctx.drawImage(artwork, blurred.x, blurred.y, blurred.width, blurred.height);
    ctx.restore();

    const fitted = coverRect(artwork.width, artwork.height, hero.x, hero.y, hero.width, hero.height, position);
    ctx.globalAlpha = 0.96;
    ctx.drawImage(artwork, fitted.x, fitted.y, fitted.width, fitted.height);
  }
  ctx.globalAlpha = 1;
  const shade = ctx.createLinearGradient(0, 160, 0, 510);
  shade.addColorStop(0, "#00000010");
  shade.addColorStop(1, "#100d18");
  ctx.fillStyle = shade;
  ctx.fillRect(hero.x, hero.y, hero.width, hero.height);
  ctx.restore();

  const wrap = (value: string, y: number, max: number, size = 22, left = 45) => {
    ctx.font = `${size}px sans-serif`;
    let line = "";
    for (const word of value.split(" ")) {
      if (ctx.measureText(`${line}${word}`).width > max && line) {
        text(line.trim(), y, size, "#f5eff8", left);
        y += size * 1.35;
        line = "";
      }
      line += `${word} `;
    }
    text(line.trim(), y, size, "#f5eff8", left);
    return y + size * 1.35;
  };
  wrap(b.snapshot.movie.title, 430, titleWidth, 37, titleX);
  text(`${b.snapshot.show.language} · ${b.snapshot.show.format}`, formatY, 20, "#ded8e3", titleX);

  ctx.setLineDash([6, 8]);
  ctx.strokeStyle = "#ad83966f";
  ctx.beginPath();
  ctx.moveTo(40, 545);
  ctx.lineTo(860, 545);
  ctx.stroke();
  ctx.setLineDash([]);
  let y = 590;
  for (const [label, value] of [
    ["CINEMA", b.snapshot.venue.name],
    ["SCREEN", b.snapshot.auditorium],
    ["DATE & TIME", `${b.snapshot.show.date} · ${b.snapshot.show.time} IST`],
    [`SEATS · ${b.seats.length} ${b.seats.length === 1 ? "TICKET" : "TICKETS"}`, b.seats.join(", ")],
    ["TOTAL · SIMULATED PAYMENT", rupees(b.pricing.total)],
  ]) {
    text(label, y, 14, "#c1a1ad");
    y = wrap(value, y + 29, 460, 22) + 18;
  }
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.roundRect(575, 600, 265, 265, 20);
  ctx.fill();
  ctx.drawImage(code, 590, 615, 235, 235);
  text("Scan at Entry", 900, 20, "#f8bd7c", 642);
  ctx.save();
  ctx.translate(705, 960);
  ctx.rotate(-8 * Math.PI / 180);
  ctx.strokeStyle = "#f8bd7c";
  ctx.lineWidth = 2;
  ctx.strokeRect(-90, -28, 180, 46);
  text("BOOKED", 3, 24, "#f8bd7c", -53);
  ctx.restore();
  ctx.setLineDash([5, 8]);
  ctx.strokeStyle = "#ad83966f";
  ctx.beginPath();
  ctx.moveTo(550, 575);
  ctx.lineTo(550, 980);
  ctx.stroke();
  ctx.setLineDash([]);
  text("BOOKING ID", 1065, 15, "#bca4c6");
  wrap(b.id, 1102, 800, 22);
  text(`Booked on ${new Date(b.created).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" })}`, 1155, 18);
  text("DEMO TICKET · NO REAL CINEMA ADMISSION", 1210, 20, "#ffbe7b");
  text("Simulated payment. No money was charged.", 1250, 19);
  ctx.globalCompositeOperation = "destination-out";
  for (const cx of [0, 900]) {
    ctx.beginPath();
    ctx.arc(cx, 545, 20, 0, Math.PI * 2);
    ctx.fill();
  }
  return canvas.toDataURL("image/png");
}
