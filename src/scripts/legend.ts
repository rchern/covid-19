export class LegendItem {
  constructor(
    private position: number,
    private color: string,
    private min: number | null,
    private max: number | null,
    private on: boolean,
    private text?: string
  ) {}

  toggle(): void {
    this.on = !this.on;
  }

  isOn(): boolean {
    return this.on;
  }

  generateLegend(): string {
    let text = "";
    if (this.text != null) {
      text = this.text;
    } else {
      text = `${this.min} to ${this.max}`;
      if (this.min === this.max) {
        text = `${this.min}`;
      } else if (this.min === null) {
        text = `<= ${this.max}`;
      } else if (this.max === null) {
        text = `>= ${this.min}`;
      }
    }
    return `
<div class='col-6 col-sm-3'>
  <div data-position="${this.position}" class="legend-value ${this.on ? "on" : ""}" style="background-color: #${this.color}">
    <div>${text}</div>
  </div>
</div>
    `;
  }

  isInRange(value: number): boolean {
    return (this.min === null || value >= this.min) && (this.max === null || value <= this.max);
  }
  getColor(): string {
    return this.color;
  }
}

export class Legend {
  constructor(private items: LegendItem[]) {}

  toggleItem(position: number): void {
    this.items[position].toggle();
  }

  getHTML(): string {
    let html = "";

    html += "<div>";
    html += "<div class='row align-items-center no-gutters'>";

    this.items.forEach((i) => (html += i.generateLegend()));

    html += "</div>";
    html += "</div>";

    return html;
  }

  isOn(position: number): boolean {
    return this.items[position].isOn();
  }

  getPosition(value: string): LegendItem {
    return this.items.find((i) => i.isInRange(Math.floor(Number(value.toString().replace(/,/g, "")))))!;
  }
}
