/** Shared by the canvas capture listeners and exact seat hit targets. */
export class SeatGesture {
  private pointers = new Set<number>();
  private origin: [number, number] = [0, 0];
  private dragged = false;
  private primary = false;
  seatId: string | null = null;
  down(id: number, x: number, y: number, button: number) {
    if (!this.pointers.size) {
      this.origin = [x, y]; this.dragged = false; this.seatId = null; this.primary = button === 0;
    }
    this.pointers.add(id);
    if (this.pointers.size > 1) this.dragged = true;
  }
  move(x: number, y: number) {
    if (this.pointers.size && Math.hypot(x-this.origin[0], y-this.origin[1]) > 6) this.dragged = true;
  }
  up(id: number) { this.pointers.delete(id); }
  cancel() { this.dragged = true; this.pointers.clear(); this.seatId = null; }
  get moving() { return this.dragged && this.pointers.size > 0; }
  accept(id: string) { return this.primary && !this.dragged && this.seatId === id; }
}
