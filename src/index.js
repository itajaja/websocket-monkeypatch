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

  this._onCommand = this._onCommand || this.on('message', (msg, { binary }) => {
    if (binary) {
      return;
    }
    const jsonMsg = JSON.parse(msg);
    const { command, data } = jsonMsg;
    if (!command || !data) {
      return;
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
 * answer for `pingTimeout` milliseconds. If `pingTimeout` is not set, it
 * will equal `interval`
 */
function monitor(interval, timeoutCb, pingTimeout) {
  pingTimeout = pingTimeout || interval;
  let currentTimeout;
  let currentInterval;

  const onTimeoutExpired = () => {
    clearTimeout(currentTimeout);
    clearInterval(currentInterval);
    timeoutCb();
  };


  const ping = () => {
    this.ping(undefined, undefined, true);

    if (currentTimeout) return;
    currentTimeout = setTimeout(onTimeoutExpired, pingTimeout);
  };

  this.on('pong', () => {
    clearTimeout(currentTimeout);
    currentTimeout = undefined;
  });

  this.on('close', () => onTimeoutExpired());
  this.on('error', () => onTimeoutExpired());
  currentInterval = setInterval(() => ping(), interval);
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
