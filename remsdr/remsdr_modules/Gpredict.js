const net = require('net');
const fs = require('fs');
var FRX_Gpredict = 0;
var FRX_Audio = 0;
var FTX_Gpredict = 0;
var FTX_Audio = 0;
var T_RX = 0;
var T_TX = 0;
const EventEmitter = require('events');
class MyEmitter extends EventEmitter {}
const myEmitter = new MyEmitter();
// increase the limit
myEmitter.setMaxListeners(221);
var GP = {
    dataRX: "",
    initRX: function () {
        const serverRX = net.createServer(function (connection) {
            console.log('client RX Gpredict connected');
            connection.on('end', function () {
                console.log('end');
            });
            connection.on('data', function (data) {
                GP.dataRX += data.toString();
                if (GP.dataRX.indexOf('\n') >= 0) {
                    var message = GP.dataRX.split('\n', 1);
                    if (message.length > 1) {
                        GP.dataRX = message[1]; //Follow on message
                    } else {
                        GP.dataRX = "";
                    }
                    message[0] = message[0].trim();
                    var cmd = message[0].substr(0, 1);
                    var parameter = message[0].substr(1).trim();
                    switch (cmd) {
                    case "F": //Receive frequency doppler corrected
                        var FfromGP = parseInt(parameter);
                        if (FfromGP > 1000000 && Math.abs(FfromGP - FRX_Audio) < 1000000) { //coherence test
                            FRX_Gpredict = FfromGP;
                            T_RX = Date.now();
                        }
                        connection.write("RPRT 0\n");
                        break;
                    case "f": //Demand the current
                        connection.write(FRX_Audio.toString() + "\n");
                        break;
                    case "q": //Connection quit
                        connection.write("RPRT 0\n");
                        break;
                    }
                }
            });
            connection.on('error', function (err) {
                console.log(`Error: ${err}`);
            });
        });
        serverRX.listen(8006, function () {
            console.log('Server Gpredict RX is listening on port 8006.');
        });
    },
    dataTX: "",
    initTX: function () {
        const serverTX = net.createServer(function (connection) {
            console.log('client TX Gpredict connected');
            connection.on('end', function () {
                console.log('end');
            });
            connection.on('data', function (data) {
                GP.dataTX += data.toString();
                if (GP.dataTX.indexOf('\n') >= 0) {
                    var message = GP.dataTX.split('\n', 1);
                    if (message.length > 1) {
                        GP.dataTX = message[1]; //Follow on message
                    } else {
                        GP.dataTX = "";
                    }
                    message[0] = message[0].trim();
                    var cmd = message[0].substr(0, 1);
                    var parameter = message[0].substr(1).trim();
                    switch (cmd) {
                    case "F":
                        var FfromGP = parseInt(parameter);
                        if (FfromGP > 1000000 && Math.abs(FfromGP - FTX_Audio) < 1000000) { //coherence test
                            FTX_Gpredict = FfromGP;
                            T_TX = Date.now();
                        }
                        connection.write("RPRT 0\n");
                        break;
                    case "f":
                        connection.write(FTX_Audio.toString() + "\n");
                        break;
                    case "q": //Quit
                        connection.write("RPRT 0\n");
                        break;
                    }
                }
                connection.on('error', function (err) {
                    console.log(`Error: ${err}`);
                });
            });
        });
        serverTX.listen(8007, function () {
            console.log('Server Gpredict TX is listening on port 8007');
        });
    }
}
function init() {
    var OnOff = "Off";
    try {
        OnOff = fs.readFileSync('/remsdr/data/Gpredict.txt', 'utf8');
    } catch (e) {}
    if (OnOff.trim() == "On") {
        GP.initRX();
        GP.initTX();
    }
    return OnOff;
}
function RX(F) {
    FRX_Audio = F;
    if (Date.now() - T_RX > 4000)
        FRX_Gpredict = 0; //Too old
    return FRX_Gpredict;
}
function TX(F) {
    FTX_Audio = F;
    if (Date.now() - T_TX > 4000)
        FTX_Gpredict = 0;
    return FTX_Gpredict;
}
function SetOn(V) {
    fs.writeFileSync('/remsdr/data/Gpredict.txt', V);
}
module.exports = {
    init,
    RX,
    TX,
    SetOn
};