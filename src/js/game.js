import Phaser from "phaser";
import throttle from "lodash/throttle";

import shipImg from "../assets/ship.png";
import bulletImg from "../assets/bullets.png";

import constants from "./constants";
import { randomNumber } from "./utils";
import Bullet from "./bullet";
import OP from "./OP";
import WS from "./wsClient";

class Game extends Phaser.Scene {
  constructor() {
    super({ key: "Game" });
    this.score = 0;

    // me
    this.player = null;

    // playerId -> player
    this.players = new Map();

    this.handleEnemyHit = this.handleEnemyHit.bind(this);
    this.onClientMessage = this.onClientMessage.bind(this);
    this.sendPosThrottled = throttle(this.sendPosThrottled, 10);

    WS.Client.addEventListener(WS.Event.message, this.onClientMessage);
    WS.Client.addEventListener(WS.Event.open, this.onClientConnect);
    WS.Client.addEventListener(WS.Event.error, this.onClientError);
    WS.Client.addEventListener(WS.Event.close, this.onClientClose);

    this.resize();

    window.addEventListener("resize", this.resize, false);
  }

  preload() {
    this.load.image("bullet", bulletImg);
    this.load.image("ship", shipImg);
  }

  create() {
    // Create Player                v--- we don't care about self id
    this.player = this.createPlayer(
      null,
      randomNumber(50, 750),
      randomNumber(50, 550)
    );

    this.particleEmitter = this.add.particles("bullet").createEmitter({
      speed: { min: -800, max: 800 },
      angle: { min: 0, max: 360 },
      scale: { start: 1, end: 0 },
      quantity: 10,
      blendMode: "SCREEN",
      lifespan: 200,
      active: false
    });

    this.scoreText = this.add.text(20, 16, "Score: 0", {
      fontSize: "24px",
      fill: "#fff"
    });

    this.gameOverText = this.add
      .text(
        this.game.config.width / 2,
        this.game.config.height / 2,
        "GAME OVER",
        { fontSize: "32px", fill: "#fff" }
      )
      .setActive(false)
      .setVisible(false);

    this.playAgainText = this.add
      .text(
        this.game.config.width / 2,
        this.game.config.height / 2 + 50,
        "Play Again",
        { fontSize: "20px", fill: "#fff" }
      )
      .setActive(false)
      .setVisible(false)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => {
        this.handlePlayAgain();
      });

    // Create movement controller
    this.cursors = this.input.keyboard.createCursorKeys();
    this.spacebar = this.input.keyboard.addKey(
      Phaser.Input.Keyboard.KeyCodes.SPACE
    );

    // send self to wss
    WS.Send.Register();
  }

  update() {
    if (this.player.active) {
      this.playerInputControls();
      this.sendPosThrottled();
    }

    this.physics.world.wrap(this.player, 20);
  }

  resize() {
    const canvas = document.querySelector("canvas");
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    const windowRatio = windowWidth / windowHeight;
    const gameRatio = constants.WIDTH / constants.HEIGHT;

    if (windowRatio < gameRatio) {
      canvas.style.width = windowWidth + "px";
      canvas.style.height = windowWidth / gameRatio + "px";
    } else {
      canvas.style.width = windowHeight * gameRatio + "px";
      canvas.style.height = windowHeight + "px";
    }
  }

  handleOtherPlayerMovement(playerUpdate) {
    const player = this.players.get(playerUpdate.playerId);

    if (!player)
      return console.warn(
        "cannot find player by playerId",
        playerUpdate.playerId
      );

    player.setPosition(playerUpdate.x, playerUpdate.y);
    player.setRotation(playerUpdate.rotation);
  }

  handleOtherBullets(playerUpdate) {
    const player = this.players.get(playerUpdate.playerId);

    if (!player)
      return console.warn(
        "cannot find player by playerId",
        playerUpdate.playerId
      );

    const bullet = player.playerBullets
      .get()
      .setActive(true)
      .setVisible(true);

    if (bullet) {
      bullet.fire(player);
      this.physics.add.collider(bullet, this.player, this.handleEnemyHit);
      for (const otherPlayer of this.players.values()) {
        this.physics.add.collider(bullet, otherPlayer, this.handleEnemyHit);
      }
    }
  }

  playerInputControls() {
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

    if (Phaser.Input.Keyboard.JustDown(this.spacebar)) {
      const bullet = this.player.playerBullets
        .get()
        .setActive(true)
        .setVisible(true);

      if (bullet) {
        bullet.fire(this.player);
        for (const player of this.players.values()) {
          this.physics.add.collider(bullet, player, this.handleEnemyHit);
        }
        WS.Send.FireBullet();
      }
    }
  }

  createPlayer(id, x, y) {
    const player = this.physics.add.sprite(x, y, "ship");
    player.id = id;
    player.setDamping(true);
    player.setDrag(0.99);
    player.setMaxVelocity(200);
    player.setRotation(randomNumber(-3, 3));

    player.playerBullets = this.physics.add.group({
      classType: Bullet,
      runChildUpdate: true
    });

    return player;
  }

  sendPosThrottled() {
    WS.Send.MoveTo({
      x: this.player.x,
      y: this.player.y,
      rotation: this.player.rotation,
      angularVelocity: this.player.angularVelocity,
      acceleration: this.player.body.acceleration,
      velocity: this.player.body.velocity
    });
  }

  addPlayer({ playerId, position }) {
    const newPlayer = this.createPlayer(playerId, position.x, position.y);
    this.players.set(playerId, newPlayer);
  }

  loadOtherPlayers(players) {
    players.forEach(p => this.addPlayer(p));
  }

  handleEnemyHit(bullet, enemy) {
    if (bullet.active && enemy.active) {
      // destroy bullet
      bullet.setActive(false).setVisible(false);
      enemy.destroy();

      // explode ship; particle animation
      this.particleEmitter.active = true;
      this.particleEmitter.setPosition(enemy.x, enemy.y);
      this.particleEmitter.explode();

      if (this.player.active) {
        // You're a live and you scored!
        this.score += 1;
        this.scoreText.setText(`Score: ${this.score}`);
      } else if (this.player.active === false) {
        // You got shot down!
        this.gameOverText.setActive(true).setVisible(true);
        this.playAgainText.setActive(true).setVisible(true);
      }
    }
  }

  handlePlayAgain() {
    this.gameOverText.setActive(false).setVisible(false);
    this.playAgainText.setActive(false).setVisible(false);

    this.score = 0;
    this.scoreText.setText(`Score: ${this.score}`);
    this.player = this.createPlayer(
      null,
      randomNumber(50, constants.WIDTH - 50),
      randomNumber(50, constants.HEIGHT - 50)
    );

    WS.Send.ReenterWorld();
  }

  removePlayer({ playerId }) {
    const player = this.players.get(playerId);
    player.destroy();
    this.players.delete(playerId);
  }

  onClientMessage({ data }) {
    const msg = OP.parse(data);
    switch (msg.OP) {
      case OP.PONG:
        break;
      case OP.REGISTERACK:
        WS.Send.EnterWorld();
        break;
      case OP.ENTER_WORLD_ACK:
        this.loadOtherPlayers(msg.payload);
        break;
      case OP.NEW_PLAYER:
        this.addPlayer(msg.payload);
        break;
      case OP.REMOVE_PLAYER:
        this.removePlayer(msg.payload);
        break;
      case OP.MOVE_TO:
        this.handleOtherPlayerMovement(msg.payload);
        break;
      case OP.FIRE_BULLET:
        this.handleOtherBullets(msg.payload);
        break;
      case OP.ERROR:
        // # TODO display error to user
        console.error(msg.payload);
        break;
      default:
        console.error(msg);
    }
  }

  onClientConnect() {
    // render the main game
    console.log("client connected");
  }

  onClientError(error) {
    console.error(error);
    console.log("@TODO DISPLAY DISCONNECTED");
  }

  onClientClose() {
    console.log("@TODO DISPLAY DISCONNECTED");
  }

  shutdown() {
    WS.Client.removeEventListener(WS.Event.message, this.onClientMessage);
    WS.Client.removeEventListener(WS.Event.open, this.onClientConnect);
    WS.Client.removeEventListener(WS.Event.error, this.onClientError);
    WS.Client.removeEventListener(WS.Event.close, this.onClientClose);
  }
}

export default Game;
