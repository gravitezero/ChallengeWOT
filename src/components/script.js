const ControlFreq = 1/30 * 1000;
const SensorsFreq = 300;
const host = '192.168.8.123';
const speedFactor = 1;
const MaxSpeed = 700;

const background = '0, 25, 50';
const stroke = '100, 200, 255';
const shadow = '50, 150, 255';
const error = '200, 0, 100';
const width = 2;

function capital(string)
{
    return string.charAt(0).toUpperCase() + string.slice(1);
}

function parser(data) {
  var terms = data.split(',');
  var response = {};

  for( var i in terms) { var term = terms[i];
    var term = term.split(': ')

    for( var j in term) {
      term[j] = term[j].replace('"','').replace('{', '').replace('}', '').replace('"', '');
    }

    response[term[0]] = term[1];
  }

  return response;
}

///////////////////////////////////////////////////////////////////////////////////////////////////////////////
//      map                                                                                                  //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////

function Map() {

  var canvas = document.getElementById('map').getContext('2d');

  this._width = 350;
  this._height = 200;

  this._ox = this._width /2;
  this._oy = this._height /2;

  this._point = [];
  this._origin = {x: 0, y:0, angle:0};

  this.translate = function(x, y) {
    var a = this._origin.angle;
    
    this._origin.x += Math.cos(-a)*x + Math.sin(-a)*y;
    this._origin.y += Math.cos(-a)*y + Math.sin(-a)*x;
  }

  this.rotate = function(angle) {
    this._origin.angle -= angle;
  }

  this.point = function(x, y, accuracy) {
    var o = {x: this._origin.x, y: this._origin.y, a: this._origin.angle};

    this._point.unshift({
      x: o.x + Math.cos(-o.a)*x + Math.sin(-o.a)*y,
      y: o.y + Math.cos(-o.a)*y + Math.sin(-o.a)*x,
      a: accuracy || 5});
  }

  this._pre = function(o) {

    canvas.lineWidth = width;
    canvas.fillStyle = 'rgba('+background+', 1)';
    canvas.fillRect(0, 0, this._width, this._height);

    canvas.translate(this._ox, this._oy);
    canvas.rotate(Math.PI);

    canvas.shadowBlur = 20;
    canvas.shadowColor = 'rgb('+shadow+')';
    canvas.strokeStyle = 'rgb('+stroke+')';
    canvas.beginPath();
    canvas.lineTo(10, -10);
    canvas.lineTo(0, 15);
    canvas.lineTo(-10, -10);
    canvas.stroke();
    canvas.closePath();

    canvas.rotate(-o.a);
    canvas.translate(-o.x, -o.y);

    canvas.strokeStyle = 'rgba('+stroke+', 0.2)';

    for (var i = 0; i < 5; i++) {

      var x = this._origin.x - this._origin.x%100;
      var y = this._origin.y - this._origin.y%100;

      canvas.strokeRect(x - 500, y - (100*(i-2)), 1000, 0);
      canvas.strokeRect(x - (100*(i-2)), y - 500, 0, 1000);
    };

  

  }

  this._post = function(o) {
    canvas.translate(o.x, o.y);
    canvas.rotate(o.a);
    canvas.rotate(-Math.PI);
    canvas.translate(-this._ox, -this._oy);
  }

  this._clear = function() {
    canvas.clearRect(0,0, 500, 500);
  }

  this._displayPoints = function() {
    var j = 1;
    for (var i in this._point) { var p = this._point[i];
      canvas.strokeStyle = 'rgba('+stroke+', '+ j +')';
      // canvas.strokeStyle = 'rgba(0, 0, 0, '+ j +')';
      j -= 0.01;
      if (j === 0)
        return;
      canvas.beginPath();
      canvas.arc(p.x, p.y, p.a, 0, Math.PI*2);
      canvas.stroke();

    }
  }

  this.draw = function() {
    var o = {x: this._origin.x, y: this._origin.y, a: this._origin.angle}; // NOT an error, we need the same value for pre and post processing.

    this._clear();
    this._pre(o);
    this._displayPoints();
    this._post(o);
  }

  return this;
}

var map = Map();
setInterval(map.draw, 100);


///////////////////////////////////////////////////////////////////////////////////////////////////////////////
//      controls                                                                                             //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////

function Controls() {

  var color = document.getElementById('color');
  var compass = document.getElementById('compass');
  var ultrasonic = document.getElementById('ultrasonic');


  this.setColor = function(r, g, b) {
    var context = color.getContext('2d');
    context.clearRect(0, 0, 50, 50);

    if (r === undefined)
      return;

    context.fillStyle = 'rgb('+r+', '+g+', '+b+')';
    context.beginPath();
    context.arc(25, 25, 25, 0, 2*Math.PI, false);
    context.fill();
  }

  this.setCompass = function(angle) {

    angle = angle / 180 * Math.PI; // to radian

    var context = compass.getContext('2d');
    context.clearRect(0, 0, 50, 50);

    if (angle === undefined)
      return;

    context.translate(25, 25);
    context.rotate(angle);

    context.lineWidth = width;
    context.strokeStyle = 'rgb('+stroke+')';

    context.beginPath();
    context.lineTo(0, 0);
    context.lineTo(9, -5);
    context.lineTo(0, 25);
    context.lineTo(-9, -5);
    context.lineTo(0, 0);
    context.stroke();

    context.translate(-25, -25);
  }

  this.setUltrasonic = function(intensity) {

    var context = ultrasonic.getContext('2d');
    context.clearRect(0, 0, 50, 50);

    if (intensity === undefined)
      return;

    context.translate(25, 50);
    context.rotate(Math.PI * -0.5);

    context.lineWidth = width;
    context.fillStyle = (intensity === 255) ? 'rgb('+error+')' : 'rgb('+stroke+')' ;
    intensity = intensity / 255 * 50;

    context.beginPath();
    context.lineTo(0, 0);
    context.arc(0, 0, intensity, Math.PI * -0.15, Math.PI * 0.15);
    context.arc(0, 0, intensity-5, Math.PI * 0.15, Math.PI * -0.15, true);
    context.fill();

    context.beginPath();
    context.lineTo(0, 0);
    context.arc(0, 0, 49.5, Math.PI * -0.15, Math.PI * 0.15);
    context.lineTo(0,0);
    context.strokeStyle = 'rgba('+stroke+', 0.2)';
    context.stroke();

    context.rotate(Math.PI * 0.5);
    context.translate(-25, -50);
  }

  return this;
}

var controls = new Controls();

// setInterval(function() {
  controls.setColor(10, 120, Math.floor(Math.random() * 255));
// }, 1000);

// setInterval(function() {
  controls.setUltrasonic(Math.floor(Math.random() *255));
// }, 1000);

// setInterval(function() {
  controls.setCompass(Math.random() * 360);
// }, 1000);




///////////////////////////////////////////////////////////////////////////////////////////////////////////////
//      websocket                                                                                            //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////

ws = new WebSocket("ws://" + host + ":8080/NXTWebSocketServer/socket");

ws.onopen = function(event) {
	console.log("Connected to the websocket server");
  // robot.connect(function() {
  //   consonle.log('robot connected');
  // });
};

ws.onmessage = function(event) {
	console.log("Incoming data : " + event.data);

  try {
    response = JSON.parse(event.data);
  } catch(e) {
    response = parser(event.data);
  }

  if(response.status === "connected")
    robot.isConnected(true);

  if(response.status === "disconnected")
    robot.isConnected(false);

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

  this.connect = function(callback) {
    this._callback = callback;
    var cmd = '{"action": "connect", "mode": "bt"}';
    console.log('>>>  ' + cmd);
    _sendCMD(cmd);
  }

  this.disconnect = _CMDFactory('{"action": "disconnect"}');

  this._isConnected = false;
  this._callback = undefined;

  this.isConnected = function(state) {
    this._isConnected = state;

    if (state)
      this._callback();
  }

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

    if (doClass === 'addClass')
      switch (evt.keyCode) {
        case 37: map.rotate(Math.PI/10); break; // left
        case 38: map.translate(0, 10); break; // up
        case 39: map.rotate(-Math.PI/10); break; // right
        case 40: map.translate(0, -10); break; // down
        case 32: map.point(0, 50); break; // space
      }

    }
}

$(document).keydown(keyPressed('addClass'));
$(document).keyup(keyPressed('removeClass'));

var keytochar = function(key) {
    switch (key) {
      case 32: return '_'; // space
      case 37: return "→"; // left
      case 38: return "↑ "; // up
      case 39: return "←"; // right
      case 40: return "↓ "; // down
      default: return undefined;
    }
} 