/** Prototype diagnostics, not official driving-exam scoring. Count contact episodes. */
export class ScoringSystem {
  lineCrossings = 0;
  private touching = false;
  update(contact: boolean) {
    if (contact && !this.touching) this.lineCrossings++;
    this.touching = contact;
  }
  reset() { this.lineCrossings = 0; this.touching = false; }
}
