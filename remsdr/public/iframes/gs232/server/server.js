
var rotator_port = '/dev/ttyUSB0';

var serialport = require('serialport');
var rotator = new serialport(rotator_port, {
    parser: new serialport.parsers.Readline('\r'),
    baudRate: 9600
});

//Websocket Server
var WebSocketServer = require("ws").Server
var wss = new WebSocketServer({
    port: 64000
});
var wsocket;

//Websocket Callbacks
wss.on('connection', function (ws) {
    wsocket = ws;
    console.log('Client connected');

    //On Incoming rotor
    rotator.on('data', function (data) {
        if (ws.readyState == 1) {
            ws.send(""+data);
        };
    });

    //On 
    wsocket.on('message', function (message) {
        doRotator(""+message);
    });

});

setInterval(function () {
    //Poll rotator every second.
    rotator.write('C\r');
    rotator.write('B\r'); 
}, 1000);


function doRotator(cmd) {
    console.log("Rotator: " + cmd);
    
    //Set medium speed
    rotator.write('X2\r');
    
    //Send command to ERC
    rotator.write(cmd + '\r');
}
