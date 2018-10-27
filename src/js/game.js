import Phaser from "phaser";

import spaceImg from "../assets/space.jpg";
import shipImg from "../assets/ship.png";
import bulletImg from "../assets/bullets.png";

import Bullet from "./bullet";
import OP from "./OP";
import WS from "./wsClient";

class Game extends Phaser.Scene {
  constructor() {
    super({ key: "Game" });

    // playerId -> player
    this.players = new Map();

    this.onClientMessage = this.onClientMessage.bind(this);

    WS.Connect();
    WS.Client.addEventListener(WS.Event.message, this.onClientMessage);
    WS.Client.addEventListener(WS.Event.open, this.onClientConnect);
    WS.Client.addEventListener(WS.Event.error, this.onClientError);
    WS.Client.addEventListener(WS.Event.close, this.onClientClose);
  }

  preload() {
    this.load.image("space", spaceImg);
    this.load.image("bullet", bulletImg);
    this.load.spritesheet("ship", shipImg, { frameWidth: 32, frameHeight: 48 });
  }

  create() {
    this.add.tileSprite(400, 300, 800, 600, "space");

    // Create Player                v--- we don't care about self id
    this.player = this.createPlayer(null, 100, 450);

    // Fires bullet from player on left click of mouse
    this.input.on(
      "pointerdown",
      function(pointer, time, lastFired) {
        if (this.player.active === false) return;

        // Get bullet from bullets group
        var bullet = this.player.playerBullets
          .get()
          .setActive(true)
          .setVisible(true);

        if (bullet) {
          bullet.fire(this.player, pointer);
        }
      },
      this
    );

    // send self to wss
    WS.Send.Register();
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

  createPlayer(id, x, y) {
    const player = this.physics.add.sprite(100, 450, "ship");
    player.id = id;
    player.setDamping(true);
    player.setDrag(0.99);
    player.setMaxVelocity(200);

    player.playerBullets = this.physics.add.group({
      classType: Bullet,
      runChildUpdate: true
    });

    return player;
  }

  addPlayer({ playerId, position }){
    const newPlayer = this.createPlayer(playerId, position.x, position.y);
    this.players.set(playerId, newPlayer);
  }

  loadOtherPlayers(players){
    console.log('loadOtherPlayers', players);
  }

  onClientMessage({ data }) {
    const msg = OP.parse(data);
    switch( msg.OP ){
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
        console.log('OP:REMOVE_PLAYER', msg.payload);
        // { playerId } = msg.payload;
        // this.removePlayer(playerId);
        break;
      case OP.MOVE_TO:
        console.log('OP:MOVE_TO', msg.payload);
        // { playerId, position } = msg.payload;
        // this.playerMovesTo(playerId, position)
        break;
      case OP.ERROR:
        // # TODO display error to user
        console.error(msg.payload);
        break;
      default:
        console.error(msg.payload);
    }
  }

  onClientConnect() {
    // render the main game
    console.log('client connected');
  }

  onClientError(error) {
    console.error(error);
    console.log('@TODO DISPLAY DISCONNECTED');
  }

  onClientClose() {
    console.log('@TODO DISPLAY DISCONNECTED');
  }

  shutdown() {
    WS.Client.removeEventListener(WS.Event.message, this.onClientMessage);
    WS.Client.removeEventListener(WS.Event.open, this.onClientConnect);
    WS.Client.removeEventListener(WS.Event.error, this.onClientError);
    WS.Client.removeEventListener(WS.Event.close, this.onClientClose);
  }
}

export default Game;
