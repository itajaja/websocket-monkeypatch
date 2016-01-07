'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = patch;
/**
 * send a json message serialized to string
 */
function sendJson(data, options, callback) {
  var jsonData = JSON.stringify(data);
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
  return this.sendJson({ command: command, data: data }, options, callback);
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
  var _this = this;

  this.registeredCommands = this.registeredCommands || {};

  this._onCommand = this._onCommand || this.on('message', function (msg) {
    var jsonMsg = JSON.parse(msg);
    var command = jsonMsg.command;
    var data = jsonMsg.data;

    if (!command || !data) {
      throw new Error('invalid message received. ' + jsonMsg);
    }

    var callback = _this.registeredCommands[command];
    if (!callback) {
      throw new Error('the callback for ' + command + ' was not registered');
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
  var _this2 = this;

  var currentTimeout = undefined;

  var onTimeoutExpired = function onTimeoutExpired() {
    clearTimeout(currentTimeout);
    timeoutCb();
  };

  var ping = function ping() {
    setTimeout(function () {
      _this2.ping(undefined, undefined, true);
      currentTimeout = setTimeout(onTimeoutExpired, interval);
    }, interval);
  };

  this.on('pong', function () {
    clearTimeout(currentTimeout);
    ping();
  });

  ping();
}

/**
 * Monkey patching ws with some utility methods
 */
function patch(WebSocket) {
  WebSocket.prototype.sendJson = sendJson;
  WebSocket.prototype.sendCommand = sendCommand;
  WebSocket.prototype.onCommand = onCommand;
  WebSocket.prototype._registerCommandHandler = _registerCommandHandler;
  WebSocket.prototype.monitor = monitor;
}