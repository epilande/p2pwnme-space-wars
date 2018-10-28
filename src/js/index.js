import Phaser from "phaser";

import WS from "./wsClient";
import constants from "./constants";
import GameScene from "./game";

WS.Connect();

const config = {
  type: Phaser.AUTO,
  width: constants.WIDTH,
  height: constants.HEIGHT,
  physics: {
    default: "arcade",
    arcade: {
      gravity: {
        y: 0
      },
      debug: false
    }
  },
  scene: [GameScene]
};

// eslint-disable-next-line no-new
setTimeout(() => {
  new Phaser.Game(config);
}, 5000);

if (module.hot) {
  module.hot.accept(() => {});

  module.hot.dispose(() => {
    window.location.reload();
  });
}
