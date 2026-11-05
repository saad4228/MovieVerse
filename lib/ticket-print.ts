import QRCode from "qrcode";

/** Stable booking-linked demo verification URL, identical in every export. */
export function ticketQr(token: string, origin: string) {
  if (!token) throw new Error("Booking verification token is missing.");
  return QRCode.toDataURL(`${origin}/ticket/${encodeURIComponent(token)}`, {
    width: 960, margin: 4, errorCorrectionLevel: "M", color: { dark: "#090b12", light: "#ffffff" },
  });
}
export async function prepareTicketPrint(article: HTMLElement, qr: string) {
  const sheet = document.createElement("div");
  sheet.id = "ticket-print-sheet";
  const copy = article.cloneNode(true) as HTMLElement;
  copy.removeAttribute("inert");
  copy.querySelectorAll("[inert]").forEach(node=>node.removeAttribute("inert"));
  copy.querySelectorAll("button, .premium-ticket-actions, .ticket-qr-scan").forEach(node=>node.remove());
  const code = copy.querySelector<HTMLImageElement>(".qr-code");
  if (!code || !qr.startsWith("data:image/png;base64,")) throw new Error("The ticket QR is not ready.");
  code.src = qr;
  code.width = 960; code.height = 960;
  sheet.appendChild(copy);
  document.body.appendChild(sheet);
  let timeout = 0;
  try {
    const assets = Promise.all([
      document.fonts.ready,
      ...Array.from(sheet.querySelectorAll("img")).map(async img=>{
        img.loading = "eager";
        await img.decode();
        if (!img.naturalWidth) throw new Error("A ticket image failed to load.");
      }),
    ]);
    await Promise.race([assets, new Promise<never>((_,reject)=>{ timeout = window.setTimeout(()=>reject(new Error("Ticket images did not load in time.")), 10000); })]);
    await new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve())));
    return sheet;
  } catch (error) { sheet.remove(); throw error; }
  finally { window.clearTimeout(timeout); }
}
