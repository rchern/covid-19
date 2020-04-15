export default class LogarithmicSlider {
  private minp: number;
  private maxp: number;
  private minv: number;
  private maxv: number;
  private scale: number;

  constructor(private buckets: number, private max: number) {
    this.minp = 0;
    this.maxp = buckets - 1;
    this.minv = 0;
    this.maxv = Math.log(max);
    this.scale = (this.maxv - this.minv) / (this.maxp - this.minp);
  }
  getPosition(value: number): number {
    if (value <= 0) {
      return 0;
    }
    let position = Math.ceil((Math.log(value) - this.minv) / this.scale + this.minp);
    if (position === 0 && value > 0) {
      position = 1;
    }
    return position;
  }
  getValue(position: number): number {
    let value = Math.round(Math.exp(this.minv + this.scale * (position - this.minp)));
    if (position === 0 && value > 0) {
      value = 0;
    }
    return value;
  }
}
