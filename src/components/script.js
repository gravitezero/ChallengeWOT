const ControlFreq = 700;
const SensorsFreq = 700;
const host = '192.168.2.4';
const speedFactor = 1;
const MaxSpeed = 200;
const translateFactor = 45.6;

const background = '0, 25, 50';
const stroke = '145, 248, 255';
const shadow = '50, 150, 255';
const error = '200, 0, 100';
const width = 2;

const autoSensors = [
  'color'
  // ,'compass'
  // ,'ultrasonic'
];
const manuSensors = [
  'color'
  ,'compass'
  ,'ultrasonic'
];

var auto = false;
var countG=0;
var countR=0;

var sonarFactor = 1;
var sonarOffset = 0;

var mutex = false;
// var ws = new WebSocket();

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
  this._oy = this._height /1.1;

  this._point = [];
  this._origin = {x: 0, y:0, angle:0};

  this.getPosFromDist = function(d) {
    var a = this._origin.angle;
    
    return [
      this._origin.x + Math.sin(-a)*d,
      this._origin.y + Math.cos(-a)*d
    ];
  }

  this.translate = function(x, y) {

    var a = this._origin.angle;
    
    this._origin.x += Math.cos(-a)*x + Math.sin(-a)*y;
    this._origin.y += Math.cos(-a)*y + Math.sin(-a)*x;
  }

  this.rotate = function(angle) {
    this._origin.angle = angle;
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

    // Compass
    canvas.translate(330, 20);
    canvas.rotate(-o.a-Math.PI);

    canvas.strokeStyle = 'rgba('+stroke+', 0.2)';
    canvas.beginPath();
    canvas.arc(0, 0, 13, 0, 2*Math.PI);
    canvas.stroke();

    canvas.strokeStyle = 'rgb('+stroke+')';
    canvas.beginPath();
    canvas.lineTo(0, 5);
    canvas.lineTo(5, 3);
    canvas.lineTo(0, 17);
    canvas.lineTo(-5, 3);
    canvas.closePath();
    canvas.stroke();

    canvas.rotate(o.a+Math.PI);
    canvas.translate(-330, -20);

    canvas.translate(this._ox, this._oy);
    canvas.rotate(Math.PI);

    canvas.shadowBlur = 20;
    canvas.shadowColor = 'rgb('+shadow+')';
    canvas.strokeStyle = 'rgb('+stroke+')';
    canvas.beginPath();
    canvas.lineTo(5, -5);
    canvas.lineTo(0, 7);
    canvas.lineTo(-5, -5);
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
    var pos = robot.getPos();
    var o = {x: pos.x, y: pos.y, a: this._origin.angle}; // NOT an error, we need the same value for pre and post processing.

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


  this.setcolor = function(c) {
    var context = color.getContext('2d');
    context.clearRect(0, 0, 50, 50);

    if (c === undefined)
      return;

    if (auto)
      robot.sendNextCommand(c);

    context.fillStyle = 'rgb('+c.r+', '+c.g+', '+c.b+')';
    context.beginPath();
    context.arc(25, 25, 25, 0, 2*Math.PI);
    context.fill();
  }

  this.setcompass = function(angle) {
    if (angle === undefined)
      return;

    angle = angle / 180 * Math.PI; // to radian

    var context = compass.getContext('2d');
    context.clearRect(0, 0, 50, 50);

    map.rotate(angle);

    context.translate(25, 25);
    context.rotate(angle+Math.PI);

    context.lineWidth = width;

    context.strokeStyle = 'rgba('+stroke+', 0.2)';
    context.beginPath();
    context.arc(0, 0, 17, 0, 2*Math.PI);
    context.stroke();

    context.strokeStyle = 'rgb('+stroke+')';
    context.beginPath();
    context.lineTo(0, 10);
    context.lineTo(9, 5);
    context.lineTo(0, 25);
    context.lineTo(-9, 5);
    context.closePath();
    context.stroke();

    context.rotate(-angle-Math.PI);
    context.translate(-25, -25);
  }

  this.setultrasonic = function(intensity) {

    var context = ultrasonic.getContext('2d');
    context.clearRect(0, 0, 50, 50);

    if (intensity === undefined)
      return;

    var pos = robot.getPos();

    map.point(0, (intensity * 3)*sonarFactor + sonarOffset);
    // map.point(pos.x, pos.y + (intensity * 3)*sonarFactor + sonarOffset);

    context.translate(25, 50);
    context.rotate(Math.PI * -0.5);

    context.lineWidth = width;
    context.fillStyle = (intensity === 255) ? 'rgb('+error+')' : 'rgb('+stroke+')' ;
    intensity = intensity / 255 * 50;

    context.beginPath();
    context.lineTo(0, 0);
    context.arc(0, 0, intensity, Math.PI * -0.15, Math.PI * 0.15);
    context.arc(0, 0, Math.max(intensity-5, 0), Math.PI * 0.15, Math.PI * -0.15, true);
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

///////////////////////////////////////////////////////////////////////////////////////////////////////////////
//      websocket                                                                                            //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////

var autoButton = $('#auto');
autoButton.click(function() {

  if (!robot._isConnected)
    return;

  if(auto) {
    robot.pollSensors(manuSensors);
    auto = false;
    autoButton.removeClass('disconnect').addClass('connect');
  } else {
    robot.clearPoll();
    robot.sensors(autoSensors);
    auto = true;
    autoButton.removeClass('connect').addClass('disconnect');
  }

});

var button = $('#button');
button.click(function(){

  if(button.hasClass('disconnect')) {
    robot.disconnect();
    button.removeClass('disconnect').addClass('connect');
    return;
  }

  if(button.hasClass('pending'))
    return;

  button.removeClass('connect').addClass('pending');

  ws = new WebSocket("ws://" + $('#address').val() + ":8080/NXTWebSocketServer/socket");

  ws.onopen = function(event) {
    console.log("Connected to the websocket server");
    robot.connect(function() {
      console.log("robot connected");
      button.removeClass('pending').addClass('disconnect');
      robot.pollSensors(['ultrasonic', 'compass']);
    });
  };

  ws.onmessage = function(event) {
    // console.log("Incoming data : " + event.data);

    try {
      response = JSON.parse(event.data);
    } catch(e) {
      response = parser(event.data);
    }

    if(response.status === "connected")
      robot.isConnected(true);

    if(response.status === "disconnected")
      robot.isConnected(false);

    if( response.sensor_response)
      for (var i in response.sensor_response) { var sensor = response.sensor_response[i];
        robot.setSensorValue(sensor.name, sensor.value);
      }

    // We received sensors data, update stuffs

  };

  ws.onclose = function(event) {
    console.log("Disconnected to the websocket server");
  };
});

///////////////////////////////////////////////////////////////////////////////////////////////////////////////
//      NXT                                                                                                  //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////


function NXT() {

  const _sensors = {
    touch : '{name: "touch"}',
    color : '{name: "color"}',
    accelerometer : '{name: "accelerometer"}',
    compass : '{name: "compass"}',
    ultrasonic : '{name: "ultrasonic"}'
  }

  this.sensors = {}

  this._lastCommand = undefined;

  this.connect = function(callback) {
    this._callback = callback;
    var cmd = '{"action": "connect", "mode": "bt"}';
    _sendCMD(cmd);
  }

  this.disconnect = function() {
    robot.motors([0, 0]);
    _sendCMD('{"action": "disconnect"}');
  }

  this._isConnected = false;
  this._callback = undefined;

  this.isConnected = function(state) {
    this._isConnected = state;

    if (state && this._callback)
      this._callback();

    this._callback = undefined;
  }

  this.getPos = function() {
    if(!mutex)
      return map._origin;

    var dt = Date.now() - this._lastCommand;
    return map.getPosFromDist(dt * this._speed);

  }

  this.motors = function(motors) {
    // [left, right]

    if (!motors)
      return;

    // console.log('motors good');

    if (mutex)
      return;

    // console.log('no mutex');

    // mutex = true;

    if(this._lastCommand) {
      var dt = Date.now() - this._lastCommand;
      var d = this._speed * dt * translateFactor * 0.000001;

      // console.log(">>> motors ", d);

      map.translate(0, d);
    }

    this._lastCommand = Date.now();
    this._speed = (motors[0] + motors[1]) / 2;

    if (motors[0] === motors[1])
      _sendCMD('{"motor_command":[{"name": "both", "action": "start",  "speed": ' + motors[0] + '}]}');
    else
      _sendCMD('{"motor_command":[{"name": "left", "action": "start",  "speed": ' + motors[0] + '}, {"name": "right", "action": "start",  "speed": ' + motors[1] + '}]}');

  }

  this.motorsStep = function(motors) {
    // [[leftstep, leftspeed], [rightstep, rightspeed]]
    if (!motors)
      return;

    if (mutex)
      return;

    this._lastCommand = Date.now();
    this._speed = (motors[0][1] + motors[1][1]) / 2;
    mutex = true;

    var dt = motors[0][0] / motors[0][1];

    setTimeout(function() {
      console.log("action finished");
      mutex = false;
      map.translate(0, dt * this._speed * 0.01);
    }, dt + 100);

    if (motors[0][1] === motors[0][1])
      _sendCMD('{"motor_command":[ {"name": "right", "action": "step",  "step": ' + motors[0][0] + ', "speed": ' + motors[0][1] + '} , {"name": "left", "action": "step",  "step": ' + motors[1][0] + ', "speed": ' + motors[1][1] + '} ]}');
    else
      _sendCMD('{"motor_command":[ {"name": "both", "action": "step",  "step": ' + motors[0][0] + ', "speed": ' + motors[0][1] + '}]}');

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
    var str = [];

    for (var i in sensors) { var sensor = sensors[i];
      str.push(_sensors[sensor]);
    }

    if (this._poll)
      this.clearPoll();
    this._poll = setInterval(_CMDFactory('{sensor_request:[' + str.toString() + ']}'), SensorsFreq);
  }

  this.clearPoll = function() {
    clearInterval(this._poll);
    this._poll = undefined;
  }

  this.setSensorValue = function(name, value) {
    this.sensors[name] = value;
    controls['set'+name](value);
  }

  this.sendNextCommand = function(c) {
    if (auto)
      robot.sensors(autoSensors);

    var dr=Math.sqrt( (c.r-240)*(c.r-240) + (c.g-115)*(c.g-115) + (c.b- 80)*(c.b- 80));
    var dg=Math.sqrt( (c.r-130)*(c.r-130) + (c.g-170)*(c.g-170) + (c.b- 90)*(c.b- 90));
    var dw=Math.sqrt( (c.r-240)*(c.r-240) + (c.g-240)*(c.g-240) + (c.b-200)*(c.b-200));
    var db=Math.sqrt( (c.r-60)*(c.r-60) + (c.g-60)*(c.g-60) + (c.b-60)*(c.b-60));
    
    dw=dw*4;
    
    var step = 50;
    var speed = 100;
    
    if (dr<dg && dr<dw && dr<db){  // RED
       //console.log("red");
       if (countR==0) robot.motors([step,-step]);
       else robot.motors([countR*step-20,-countR*step]);
       if (countR<3) countR++;
       countG=0;
    }
    else{
        if (dg<dw && dr<db){  // GREEN
             //console.log("green");
             if (countG==0) robot.motors([-step,step]);
             else  robot.motors([-countG*step,countG*step-20]);
             if (countG<3) countG++;
             countR=0;
        }
        else{
           if (dw<db){  // WHITE
           //console.log("white");
           robot.motors([speed,speed]);
           countG=0;
           countR=0;
           }
           else{
               robot.motors([0,0]);
           }
        }
    }
  }

  function _CMDFactory(cmd) {
    return function() {
      // console.log('>>>  ' + cmd);
      _sendCMD(cmd);
    }
  }

  function _sendCMD(cmd) {
    console.log('>>> ' + cmd);
    if (ws && ws.readyState === 1)
      ws.send(cmd);
  }
 
  return this;
}

var robot = NXT();

///////////////////////////////////////////////////////////////////////////////////////////////////////////////
//      JOYSTICK CONTROL                                                                                     //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////

// console.log("touchscreen is", VirtualJoystick.touchScreenAvailable() ? "available" : "not available");

var joystick    = new VirtualJoystick({
  container       : document.getElementById('container'),
  mouseSupport    : true,
  strokeStyle     : 'rgb('+stroke+')'
});
var outputEl    = document.getElementById('result');

setInterval(function(){
  if (auto || !robot._isConnected)
    return;

  var dx = joystick.deltaX();
  var dy = joystick.deltaY();

  robot.motors(toMotorControls(dx, dy));
  // robot.motorsStep(toMotorStep(joystick));

}, ControlFreq);

var toMotorControls = function(dx, dy) {

  left = (Math.cos(3*Math.PI/8) * dx - Math.sin(3*Math.PI/8) * dy) * speedFactor;
  left = Math.max(-MaxSpeed, Math.min(MaxSpeed,left));

  right = -(Math.sin(Math.PI/8) * dx + Math.cos(Math.PI/8) * dy) * speedFactor;
  right = Math.max(-MaxSpeed, Math.min(MaxSpeed,right));

  return [Math.floor(left), Math.floor(right)];
}

var toMotorStep = function(joystick) {

  const speed = 200;
  const step = 100;

  if(joystick.up())
    return [[step, speed], [step, speed]];

  if(joystick.right())
    return [[-step, speed], [step, speed]];

  if(joystick.left())
    return [[step, speed], [-step, speed]];

  return undefined;
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

      // switch (evt.keyCode) {
      //   case 37: map.rotate(Math.PI/10); controls.setcompass((map._origin.angle +Math.PI/10) * 180 / Math.PI); break; // left
      //   case 38: map.translate(0, 10); break; // up
      //   case 39: map.rotate(-Math.PI/10); controls.setcompass((map._origin.angle -Math.PI/10) * 180 / Math.PI); break; // right
      //   case 40: map.translate(0, -10); break; // down
      //   case 32: map.point(0, 50); break; // space
      // }

    if (doClass === 'addClass') {
      switch (evt.keyCode) {
        case 37: robot.motorsStep([100, -100]); break; // left
        case 38: robot.motorsStep([100, 100]); break; // up
        case 39: robot.motorsStep([-100, 100]); break; // right
        case 40: robot.motorsStep([-100, -100]); break; // down
        case 32: map.point(0, 50); break; // space
      }
    } else {
      // robot.motors(0,0);
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