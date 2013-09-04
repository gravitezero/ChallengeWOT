// Get a reference to the element.
// var elem = document.getElementById('radar');

// // Always check for properties and methods, to make sure your code doesn't break 
// // in other browsers.
// if (elem && elem.getContext) {
//   // Get the 2d context.
//   // Remember: you can only initialize one context per element.
//   var context = elem.getContext('2d');
//   if (context) {

//      context.translate(500, 400);
//      context.rotate( - Math.PI /2 );

//      context.beginPath();

//  context.lineWidth = 1;
//  context.strokeStyle = '#000';



//     setInterval(function(context) {
//      // line(context, Math.random()*200);
//      context.lineTo(Math.random()*100 + 100, 0);
//      context.stroke();
//      context.rotate( - Math.PI / 30);
//     }, 100, context);

//   }
// }

// var line = function(context, n) {
//  context.fillRect(0, 0, n ,1);
// }

var canvas = new fabric.Canvas('radar');

// var rect = new fabric.Rect({
//   left: 100,
//   top: 100,
//   fill: 'red',
//   width: 20,
//   height: 20
// });

// canvas.add(rect);

canvas.centerTransformation = true;

var path = new fabric.Path('M 0 0 L 200 100 L 170 200');
path.set({ left: 120,
           top: 120,
           stroke: 'black',
           fill: false
           // selectable: false,
           // hasBorders: false,
           // hasControls : false,
           // hasRotatingPoint : false
        });


var group = new fabric.Group();
group.add(path);

path.path.push(['L', 100, 100]);

canvas.add(path);




