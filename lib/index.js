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

  this._onCommand = this._onCommand || this.on('message', function (msg, _ref) {
    var binary = _ref.binary;

    if (binary) {
      return;
    }
    var jsonMsg = JSON.parse(msg);
    var command = jsonMsg.command;
    var data = jsonMsg.data;

    if (!command || !data) {
      return;
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
 * answer for `pingTimeout` milliseconds. If `pingTimeout` is not set, it
 * will equal `interval`
 */
function monitor(interval, timeoutCb, pingTimeout) {
  var _this2 = this;

  pingTimeout = pingTimeout || interval;
  var currentTimeout = void 0;
  var currentInterval = void 0;
  var closed = false;

  var onTimeoutExpired = function onTimeoutExpired() {
    if (closed) return;
    closed = true;

    clearTimeout(currentTimeout);
    clearInterval(currentInterval);
    timeoutCb();
  };

  var ping = function ping() {
    _this2.ping(undefined, undefined, true);

    if (currentTimeout) return;
    currentTimeout = setTimeout(onTimeoutExpired, pingTimeout);
  };

  this.on('pong', function () {
    clearTimeout(currentTimeout);
    currentTimeout = undefined;
  });

  this.on('close', function () {
    return onTimeoutExpired();
  });
  this.on('error', function () {
    return onTimeoutExpired();
  });
  currentInterval = setInterval(function () {
    return ping();
  }, interval);
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