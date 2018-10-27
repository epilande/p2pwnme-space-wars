import Phaser from "phaser";

import spaceImg from "../assets/space.jpg";
import shipImg from "../assets/ship.png";
import bulletImg from "../assets/bullets.png";

import Bullet from "./bullet";

class Game extends Phaser.Scene {
  constructor() {
    super({ key: "Game" });
  }

  preload() {
    this.load.image("space", spaceImg);
    this.load.image("bullet", bulletImg);
    this.load.spritesheet("ship", shipImg, { frameWidth: 32, frameHeight: 48 });
  }

  create() {
    this.add.tileSprite(400, 300, 800, 600, "space");

    // Create Player
    this.player = this.physics.add.sprite(100, 450, "ship");
    this.player.setDamping(true);
    this.player.setDrag(0.99);
    this.player.setMaxVelocity(200);

    this.playerBullets = this.physics.add.group({
      classType: Bullet,
      runChildUpdate: true
    });

    // Fires bullet from player on left click of mouse
    this.input.on(
      "pointerdown",
      function(pointer, time, lastFired) {
        if (this.player.active === false) return;

        // Get bullet from bullets group
        var bullet = this.playerBullets
          .get()
          .setActive(true)
          .setVisible(true);

        if (bullet) {
          bullet.fire(this.player, pointer);
        }
      },
      this
    );
  }

  update() {
    // Create movement controller
    this.cursors = this.input.keyboard.createCursorKeys();

    if (this.cursors.left.isDown) {
      this.player.setAngularVelocity(-150);
    } else if (this.cursors.right.isDown) {
      this.player.setAngularVelocity(150);
    } else {
      this.player.setAngularVelocity(0);
    }

    if (this.cursors.up.isDown) {
      this.physics.velocityFromRotation(
        this.player.rotation,
        200,
        this.player.body.acceleration
      );
    } else {
      this.player.setAcceleration(0);
    }

    this.physics.world.wrap(this.player, 20);
  }
}

export default Game;
