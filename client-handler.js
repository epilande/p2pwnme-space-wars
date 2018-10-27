const OP = require('./src/js/OP');

// "playerId" => client
const players = new Map();

const clientConnected = client => {
  client.playerId = null; // unregistered
  client.sendOp = sendOp;
  client.receiveOp = receiveOp;
  client.register = register;

  client.on('message', receiveMessage.bind(client));
  client.on('close', disconnect.bind(client));
};

const register = function(playerId){
  this.playerId = playerId;
  this.position = { x: 0, y: 0 };
  players.set(this.playerId, this);
}

// handles errors
const sendOp = function(op, payload){
  this.send(OP.create(op, payload), error => {
    if( error !== undefined ){
      console.error(`Error writing to client socket`, error);
      disconnect.call(this);
    }
  });
}

const receiveOp = function(msg){
  let error;

  switch( msg.OP ){
    case OP.REGISTER:
      error = `You are already registered as: '${this.playerId}'`;
      this.sendOp(OP.ERROR, { error });
      break;
    case OP.ENTER_WORLD:
      // give current player initial state of the game
      this.sendOp(OP.ENTER_WORLD_ACK,
        [ ...players.values() ].filter(p => p.playerId !== this.playerId).map(({
          playerId,
          position
        }) => ({
          playerId,
          position
        }))
      );

      // broadcast new player to all existing players
      players.forEach( (player, playerUsername, map) => {
        if(player === this) return;
        player.sendOp(OP.NEW_PLAYER, {
          playerId : this.playerId,
          position : this.position
        });
      });
      break;
    case OP.MOVE_TO:
      players.forEach( (player, playerUsername, map) => {
        if(player === this) return;
        player.sendOp(OP.MOVE_TO, { playerId: this.playerId, ...msg.payload });
      });
      break;
    case OP.FIRE_BULLET:
      players.forEach( (player, playerUsername, map) => {
        if(player === this) return;
        player.sendOp(OP.FIRE_BULLET, { playerId: this.playerId, ...msg.payload });
      });
      break;
    case OP.STOP_MOVING:
      players.forEach( (player) => {
        if(player === this) return
        player.sendOp(OP.STOP_MOVING, msg.payload);
      });
      break;
    default:
      error = `Unknown OP received. Server does not understand: '${msg.OP}'`;
      console.warn(error);
      this.sendOp(OP.ERROR, { error });
      return;
  }
}

const receiveMessage = function(message){
  let msg;
  try{
    msg = OP.parse(message);
  }catch(error){
    console.error(error);
    return this.sendOp(OP.ERROR, { error });
  }

  if( msg.OP === OP.PING) return this.sendOp(OP.PONG);

  // trap unregistered users
  if( this.playerId === null ){
    // wait for OP:REGISTER
    if( msg.OP === OP.REGISTER ){
      const playerId = Date.now().toString();
      // add the player to players
      if( players.has(playerId) ){
        // player name is taken
        const error = `playerId: '${msg.payload.playerId}' is not available.`;
        this.sendOp(OP.ERROR, { error });
      } else {
        // playerId is available, register the player
        this.register(playerId);
        this.sendOp(OP.REGISTERACK);
        console.info(`Client playerId:'${this.playerId}' has joined.`);
      }
    } else {
      const error = `You are not registered yet. Register with OP:REGISTER first.`;
      this.sendOp(OP.ERROR, { error });
    }
    return; // trap
  }

  this.receiveOp(msg);
}

const disconnect = function(){
  if( this.playerId !== null ){
    if( players.has(this.playerId) ){
      players.delete(this.playerId);
    }
    console.info(`Client playerId:'${this.playerId}' has disconnected.`);
  } else console.debug(`Client <anonymous> has disconnected.`);
}

module.exports = {
  clientConnected
};
