const ControlFreq = 1/30 * 1000;
const SensorsFreq = 300;
const host = '192.168.8.128';
const speedFactor = 1;

///////////////////////////////////////////////////////////////////////////////////////////////////////////////
//      websocket                                                                                            //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////

ws = new WebSocket("ws://" + host + ":8080/NXTWebSocketServer/socket");

ws.onopen = function(event) {
	console.log("Connected to the websocket server");
};

ws.onmessage = function(event) {
	console.log("Incoming data : " + event.data);

  response = JSON.parse(event.data);

  for (var i in response.sensor_response) { var sensor = response.sensor_response[i];
    NXT.setSensorValue(sensor.name, sensor.value);
  }

  // We received sensors data, update stuffs

};

ws.onclose = function(event) {
	console.log("Disconnected to the websocket server");
};

function NXT() {

  const _sensors = {
    touch : '{name: "touch"}',
    color : '{name: "color"}',
    accelerometer : '{name: "accelerometer"}',
    compass : '{name: "compass"}',
    ultrasonic : '{name: "ultrasonic"}'
  }

  this.sensors = {}

  this.connect = _CMDFactory('{"action": "connect", "mode": BT}');
  this.disconnect = _CMDFactory('{"action": "disconnect"}');

  this.motors = function(motors) {
    // [left, right]
    _sendCMD('{"motor_command":[{"name": "left", "action": "start",  "speed": ' + motors[0] + '}, {"name": "right", "action": "start",  "speed": ' + motors[1] + '}]}');

  }

  this.motorsStep = function(motors) {
    // [[leftstep, leftspeed], [rightstep, rightspeed]]
    _sendCMD('{"motor_command":[ {"name": "right", "action": "step",  "step": ' + motors[0][0] + ', "speed": ' + motors[0][1] + '} , {"name": "left", "action": "step",  "step": ' + motors[1][0] + ', "speed": ' + motors[1][1] + '} ]}');
  }

  this.sensors = function(sensors) {
    // TODO might be too slow
    var str = '';

    for (var i in sensors) { var sensor = sensors[i];
      str += _sensors[sensor];

      if (i < sensors.length -1)
        str += ',';
    }

    _sendCMD('{sensor_request:[' + str + ']}');
  }

  this.pollSensors = function(sensors) {
    var str = '';

    for (var i in sensors) { var sensor = sensors[i];
      str += _sensors[sensor];

      if (i < sensors.length -1)
        str += ',';
    }

    if (_poll)
      this.clearPoll();
    _poll = setInterval(_CMDFactory('{sensor_request:[' + str + ']}'), SensorsFreq);
  }

  this.clearPoll = function() {
    clearInterval(_poll);
    _poll = undefined;
  }

  this.setSensorValue = function(name, value) {
    this.sensors[name] = value;
  }

  var _CMDFactory = function(cmd) {
    return function() {
      _sendCMD(cmd);
    }
  }

  var _sendCMD = function(cmd) {
    if (ws.readyState === 1)
      ws.send(cmd);
  }

}

///////////////////////////////////////////////////////////////////////////////////////////////////////////////
//      JOYSTICK CONTROL                                                                                     //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////

console.log("touchscreen is", VirtualJoystick.touchScreenAvailable() ? "available" : "not available");

console.log(document.getElementById('info'));

var joystick    = new VirtualJoystick({
  container       : document.getElementById('container'),
  mouseSupport    : true,
  strokeStyle     : 'black'
});
setInterval(function(){
  var outputEl    = document.getElementById('result');
  outputEl.innerHTML  = joystick.deltaX() + '   ' + joystick.deltaY();





}, ControlFreq);

var toMotorControls = function(dx, dy) {

  speed = Math.sqrt(dx^2 + dy^2);

  // if dx = 0, full speed on both motors
  // if dx /= 0, dy = 0, full speed on one motor

  var turnLeft = min(1, 1 + (dx / 255));
  var turnRight = min(1, 1 - (dx / 255));

  var left = speed * speedFactor * turnLeft;
  var right = speed * speedFactor * turnRight;

  return [left, right];
}



///////////////////////////////////////////////////////////////////////////////////////////////////////////////
//      KEYBOARD CONTROLS                                                                                    //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////

var log = $('#keys')[0],
    pressedKeys = [];

console.log($('#keys'));
console.log(document.getElementById('keys'));

var keyPressed = function(doClass) {
    return function(evt) {
        if (!keytochar(evt.keyCode))
            return

    var li = pressedKeys[evt.keyCode];
    if (!li) {
        li = log.appendChild(document.createElement('li'));
        pressedKeys[evt.keyCode] = li;
        $(li).text(keytochar(evt.keyCode));
    }
    $(li)[doClass]('key-up');
    }
}

$(document).keydown(keyPressed('addClass'));
$(document).keyup(keyPressed('removeClass'));

var keytochar = function(key) {
    switch (key) {
        case 32: return '_';
        case 37: return "→";
        case 38: return "↑ ";
        case 39: return "←";
        case 40: return "↓ ";
        default: return undefined;
    }
} 