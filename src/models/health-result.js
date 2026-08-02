export class HealthResult {
  constructor({
    healthy,
    status = "unknown",
    checkedAt = new Date(),
    message = ""
  }) {
    this.healthy = healthy;
    this.status = status;
    this.checkedAt = checkedAt;
    this.message = message;
  }
}
