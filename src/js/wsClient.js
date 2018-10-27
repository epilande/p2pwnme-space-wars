import OP from "./OP";

const protocol = window.location.protocol === 'https:' ? 'wss://' : 'ws://';
const host = window.document.location.host;
// const host = 'localhost:3000';

/*
 * Call Game.WS.Connect before using the client
 * listen to events that Client emits
 *   open
 *   close
 *   error
 *   message
 */
const WS = {
  Client : null,
  Connect : _ => {
    WS.Client = new WebSocket(protocol + host);
    setInterval(WS.Send.Ping, 30000);
  },
  Event : {
    open : 'open',
    close : 'close',
    error : 'error',
    message : 'message'
  },
  Send : {
    Ping : () => {
      WS.Client.send( OP.create( OP.PING ) );
    },
    Register : () => {
      WS.Client.send( OP.create( OP.REGISTER ) );
    },
    EnterWorld : () => {
      WS.Client.send( OP.create( OP.ENTER_WORLD ) );
    },
    MoveTo : position => {
      WS.Client.send( OP.create( OP.MOVE_TO, position ) );
    }
  }
};

export default WS;

