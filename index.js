/**
 * send a json message serialized to string
 */
function sendJson(data, options, callback) {
  const jsonData = JSON.stringify(data);
  return this.send(jsonData, options, callback);
}

/**
 * Send a message in the following format:
 *
 *    {
 *      command: command,
 *      data: data
 *    }
 */
function sendCommand(command, data, options, callback) {
  return this.sendJson({ command, data }, options, callback);
}

/**
 * Register a function to be called when a given command is received.
 * The message received must be of the form
 *
 *    {
 *      command: 'command',
 *      data: {}
 *    }
 */
function onCommand(command, listener) {
  this._registerCommandHandler();

  this.registeredCommands[command] = listener;
}

function _registerCommandHandler() {
  this.registeredCommands = this.registeredCommands || {};

  this._onCommand = this._onCommand || this.on('message', msg => {
    const jsonMsg = JSON.parse(msg);
    const { command, data } = jsonMsg;
    if (!command || !data) {
      throw new Error(`invalid message received. ${jsonMsg}`);
    }

    const callback = this.registeredCommands[command];
    if (!callback) {
      throw new Error(`the callback for ${command} was not registered`);
    }

    callback(data);
  });
}

/**
 * Constantly monitors if the connection is still open using ping/pong every
 * `interval` milliseconds. `timeoutCb` is called when the ping/pong doesn't
 * answer in time
 */
function monitor(interval, timeoutCb) {
  let currentTimeout;

  const onTimeoutExpired = () => {
    clearTimeout(currentTimeout);
    timeoutCb();
  };

  const ping = () => {
    setTimeout(() => {
      this.ping(undefined, undefined, true);
      currentTimeout = setTimeout(onTimeoutExpired, interval);
    }, interval);
  };

  this.on('pong', () => {
    clearTimeout(currentTimeout);
    ping();
  });

  ping();
}

/**
 * Monkey patching ws with some utility methods
 */
export default function patch(WebSocket) {
  WebSocket.prototype.sendJson = sendJson;
  WebSocket.prototype.sendCommand = sendCommand;
  WebSocket.prototype.onCommand = onCommand;
  WebSocket.prototype._registerCommandHandler = _registerCommandHandler;
  WebSocket.prototype.monitor = monitor;
}
