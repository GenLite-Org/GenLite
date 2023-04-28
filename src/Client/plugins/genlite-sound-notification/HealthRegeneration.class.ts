export class HealthRegeneration {
  healthRegenerationInterval;

  // TODO: Host as @resource?
  healthRegenAudio = new Audio('https://furious.no/downloads/genfanad/ping.wav');
  healthBarText: HTMLElement = this.getHealthBarText();
  oldHealth = -Infinity;
  isPluginEnabled: boolean = false;

  static healthRegenerationIntervalMilliseconds = 100;

  init() {
  }

  public stop() {
    clearInterval(this.healthRegenerationInterval);
  }

  public start() {
    this.healthRegenerationInterval = setInterval(() => {
      if (!this.healthBarText) {
        this.healthBarText = this.getHealthBarText();
      }

      const health = Number(this.healthBarText.innerText);

      const diff = Math.floor(health - this.oldHealth);

      if (diff === 1) {
        this.healthRegenAudio.play();
      }

      this.oldHealth = health;

    }, HealthRegeneration.healthRegenerationIntervalMilliseconds);
  }

  getHealthBarText(): HTMLElement {
    return document.querySelector('#new_ux-hp__numbers__wrapper #new_ux-hp__number--actual') as HTMLElement;
  }
}
