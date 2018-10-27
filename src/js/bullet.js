import Phaser from "phaser";

const Bullet = new Phaser.Class({
  Extends: Phaser.GameObjects.Image,

  initialize: function Bullet(scene) {
    Phaser.GameObjects.Image.call(this, scene, 0, 0, "bullet");
    this.speed = 1;
    this.born = 0;
    this.direction = 0;
    this.xSpeed = 0;
    this.ySpeed = 0;
    this.setSize(12, 12, true);
  },

  fire: function(shooter) {
    this.setPosition(shooter.x, shooter.y); // Initial position

    this.body.world.scene.physics.velocityFromRotation(
      shooter.rotation,
      400,
      this.body.velocity
    );

    this.rotation = shooter.rotation; // angle bullet with shooters rotation
    this.born = 0; // Time since new bullet spawned
  },

  // Updates the position of the bullet each cycle
  update: function(time, delta) {
    this.x += this.xSpeed * delta;
    this.y += this.ySpeed * delta;
    this.born += delta;
    if (this.born > 1800) {
      this.setActive(false);
      this.setVisible(false);
    }
  }
});

export default Bullet;
