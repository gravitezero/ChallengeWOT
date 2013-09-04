const ControlFreq = 1/30 * 1000;
const SensorsFreq = 300;
const host = '192.168.8.122';
const speedFactor = 1;
const MaxSpeed = 700;

///////////////////////////////////////////////////////////////////////////////////////////////////////////////
//      controls                                                                                             //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////

function Controls() {

  var color = document.getElementById('color');
  var compass = document.getElementById('compass');
  var ultrasonic = document.getElementById('ultrasonic');


  this.setColor = function(r, g, b) {
    var context = color.getContext('2d');

    context.fillStyle = 'rgb('+r+', '+g+', '+b+')';
    context.beginPath();
    context.arc(25, 25, 25, 0, 2*Math.PI, false);
    context.fill();
  }

  this.setCompass = function(angle) {

    angle = angle / 180 * Math.PI; // to radian

    var context = compass.getContext('2d');
    context.clearRect(0, 0, 50, 50);

    context.translate(25, 25);
    context.rotate(angle);
    context.fillStyle = 'rgb(230, 50, 70)';
    context.beginPath();
    context.lineTo(9, 0);
    context.lineTo(0, 25);
    context.lineTo(-9, 0);
    context.fill();

    context.fillStyle = 'white';
    context.beginPath();
    context.lineTo(9, 0);
    context.lineTo(0, -25);
    context.lineTo(-9, 0);
    context.fill();

    context.translate(-25, -25);
  }

  this.setUltrasonic = function(intensity) {

    var context = ultrasonic.getContext('2d');
    context.clearRect(0, 0, 50, 50);

    context.translate(25, 50);
    context.rotate(Math.PI * -0.5);
    context.fillStyle = (intensity === 255) ? 'red' : 'white' ;
    intensity = intensity / 255 * 50;
    context.beginPath();

    context.lineTo(0, 0);
    context.arc(0, 0, intensity, Math.PI * -0.15, Math.PI * 0.15);
    context.fill();

    context.rotate(Math.PI * 0.5);
    context.translate(-25, -50);
  }

  return this;
}

var controls = new Controls();

setInterval(function() {
  controls.setColor(10, 120, Math.floor(Math.random() * 255));
}, 1000);

setInterval(function() {
  controls.setUltrasonic(Math.floor(Math.random() *255));
}, 1000);

setInterval(function() {
  controls.setCompass(Math.random() * 360);
}, 1000);




///////////////////////////////////////////////////////////////////////////////////////////////////////////////
//      websocket                                                                                            //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////

ws = new WebSocket("ws://" + host + ":8080/NXTWebSocketServer/socket");

ws.onopen = function(event) {
	console.log("Connected to the websocket server");
  robot.connect();
};

ws.onmessage = function(event) {
	console.log("Incoming data : " + event.data);

  response = JSON.parse(event.data);

  if(response.status === "connected")
    robot.isConnected = true;

  if(response.status === "disconnected")
    robot.isConnected = false;

  for (var i in response.sensor_response) { var sensor = response.sensor_response[i];
    robot.setSensorValue(sensor.name, sensor.value);
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

  this.connect = _CMDFactory('{"action": "connect", "mode": "bt"}');
  this.disconnect = _CMDFactory('{"action": "disconnect"}');

  this.isConnected = false;

  this.motors = function(motors) {
    // [left, right]

    if (motors[0] === motors[1])
      _sendCMD('{"motor_command":[{"name": "both", "action": "start",  "speed": ' + motors[0] + '}]}');
    else
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
    controls['set'+name.uppercase()](value);

  }

  function _CMDFactory(cmd) {
    return function() {
      console.log('>>>  ' + cmd);
      _sendCMD(cmd);
    }
  }

  function _sendCMD(cmd) {
    if (ws.readyState === 1)
      ws.send(cmd);
  }
 
  return this;
}

var robot = NXT();


document.getElementById('disconnect').addEventListener('click', robot.disconnect);

///////////////////////////////////////////////////////////////////////////////////////////////////////////////
//      JOYSTICK CONTROL                                                                                     //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////

console.log("touchscreen is", VirtualJoystick.touchScreenAvailable() ? "available" : "not available");

var joystick    = new VirtualJoystick({
  container       : document.getElementById('container'),
  mouseSupport    : true,
  strokeStyle     : 'black'
});
setInterval(function(){
  var outputEl    = document.getElementById('result');

  var dx = joystick.deltaX();
  var dy = joystick.deltaY();

  outputEl.innerHTML  = dx + '   ' + dy;
  if (dx !== 0)
    robot.motors(toMotorControls(dx, dy));

}, ControlFreq);

var toMotorControls = function(dx, dy) {

  speed = Math.sqrt(dx * dx + dy * dy);

  if (dx > 0 && dy < 0) {
    theta = Math.atan(dx / dy);

    console.log(MaxSpeed, speed, theta);

    left = MaxSpeed * speed / 600 ;
    right = MaxSpeed * speed / 600 * (-(Math.PI/2) + 2*theta)/ (Math.PI/2);
  }
  else {
    left = 0;
    right = 0;
  }


  // if dx = 0, full speed on both motors
  // if dx /= 0, dy = 0, full speed on one motor

  // var turnLeft = Math.min(1, 1 + (dx / 255));
  // var turnRight = Math.min(1, 1 - (dx / 255));

  // var left = Math.floor(speed * speedFactor * turnLeft);
  // var right = Math.floor(speed * speedFactor * turnRight);

  console.log(left, right);

  return [Math.floor(left), Math.floor(right)];
}



///////////////////////////////////////////////////////////////////////////////////////////////////////////////
//      KEYBOARD CONTROLS                                                                                    //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////

var log = $('#keys')[0],
    pressedKeys = [];

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