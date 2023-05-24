export class HealthRegeneration {
  healthRegenerationInterval;

  // TODO: Host as @resource?
  healthRegenAudio; 
  healthBarText: HTMLElement = this.getHealthBarText();
  oldHealth = -Infinity;
  isPluginEnabled: boolean = false;

  genliteSounds;

  static healthRegenerationIntervalMilliseconds = 100;

  init(genliteSounds) {
    document.game.SFX_PLAYER.loader.load('https://furious.no/downloads/genfanad/ping.wav', this.loadSound.bind(this));
    this.genliteSounds = genliteSounds

  }

  loadSound(t){
    this.genliteSounds.genliteSFXPlayer.sounds['genlite-ping'] = t;
    document.game.SFX_PLAYER.sounds['genlite-ping'] = t;
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
        this.genliteSounds.playerInUse.play('genlite-ping');
      }

      this.oldHealth = health;

    }, HealthRegeneration.healthRegenerationIntervalMilliseconds);
  }

  getHealthBarText(): HTMLElement {
    return document.querySelector('#new_ux-hp__numbers__wrapper #new_ux-hp__number--actual') as HTMLElement;
  }
}
