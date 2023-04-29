var express = require('express');
const cors = require('cors');
var ejs = require('ejs');
var app = express();
app.engine('html', ejs.renderFile);
app.use(express.static(__dirname + '/public/'));
app.set('views', __dirname + '/EJS');
app.use('/public', express.static(__dirname + '/public/'));
app.use('/jquery', express.static(__dirname + '/node_modules/jquery/dist'));
app.use('/socket.io', express.static(__dirname + '/node_modules/socket.io/client-dist'));
const http = require('http');
const https = require('https');
const net = require('net');
const fs = require('fs');
const CPU = require('./remsdr_modules/CPU.js');
const Launcher = require('./remsdr_modules/Launcher.js');
const Gpredict = require('./remsdr_modules/Gpredict.js');
const Omnirig = require('./remsdr_modules/Omnirig.js');
const Version = require('./remsdr_modules/Version.js');

const xmlrpc = require('xmlrpc');
const udp = require('dgram');
//RX Parameters
var RX = {
    Fsdr: 432000000,
    Ffine: 0,
    Xtal_Error: 0
};
var RX_Old = {
    Fsdr: 0,
    Ffine: -1,
    Xtal_Error: -1
};
var Rx = {
    Fcentral: 432000000,
    Foffset: 0,
    IdxModul: 1,
    Squelch: -80,
    G1: 0,
    G2: 20,
    G3: 20,
    invSpectra: false,
    idxBW: 10
};
//TX Parameters
var TX = {
    Freq: 432000000,
    Fsdr: 432000000,
    LNUC: 1, //LSB_NBFM_USB_CW
    G1: 85,
    G2: 45,
    invSpectra: false,
    CTCSS: 0
};
var TX_Old = TX;
//CPU and SDRs Parameters
var dataCPU = CPU.LastInfoCPU();
var SDRrx = dataCPU.SDRrx;
var SDRtx = dataCPU.SDRtx;
var CPUshort = dataCPU.CPUshort;

//Servers
const {
    Server
} = require("socket.io");
//Load Configurations
//********************
//HTTP Server
const httpserver = http.createServer(app);
const io = new Server(httpserver, {
    cors: { //To accept cross-origin
        origin: "*",
        methods: ["GET", "POST"]
    }
});
httpserver.listen(80);
//HTTPS Server
const options = {
    key: fs.readFileSync('/remsdr/selfsigned.key'),
    cert: fs.readFileSync('/remsdr/selfsigned.crt')
};
const https_Server = https.createServer(options, app).listen(443);
const ioS = new Server(https_Server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});
//UDP TX voice
const clientTX = udp.createSocket('udp4');
//PAGES DYNAMIQUES et STATIQUES
//*******************************
app.get('/Ajax/tools.ejs', cors(), function (req, res) {
    const cp = require('child_process');
    res.render('Ajax/tools.ejs', {
        url: req["url"],
        fs: fs,
        cp: cp,
        CPU: CPU
    });
});

app.get('/Version', cors(), function (req, res) {
   	var url=req["url"];
   res.send(JSON.stringify(Version.fctVersion(url)));
});
app.get('/info_CPU', cors(), function (req, res) {
    res.send(JSON.stringify(CPU.LastInfoCPU()));
});
app.get('/RXspectra', cors(), function (req, res) {
    res.writeHead(200, {
        'Content-Type': 'multipart/octet-stream',
    });
    const client = net.createConnection({
        port: 8002
    }, () => {
        // 'connect' listener.
        console.log('connected to spectra server!');
        client.write('HelloSpectra');
    });
    client.on('data', (data) => {
        res.write(data)
    });
});
app.get('/RXaudio', cors(), function (req, res) {
    res.writeHead(200, {
        'Content-Type': 'multipart/octet-stream',
    });
    const client = net.createConnection({
        port: 8001
    }, () => {
        // 'connect' listener.
        console.log('connected to RX audio server!');
        client.write('Hello Audio');
    });
    client.on('data', (data) => {
        res.write(data)
    });
});
io.on("connection", (socket) => {
    ServersReceived(socket);
});
ioS.on("connection", (socket) => {
    ServersReceived(socket);
});
//
//Clients xmlRpc
var RXclientRpc = xmlrpc.createClient({
    host: 'localhost',
    port: 9003,
    path: '/'
})
var TXclientRpc = xmlrpc.createClient({
    host: 'localhost',
    port: 9004,
    path: '/'
})
//Init Gpredict
var GpredictOnOff = "Off";
var OmnirigOnOff = "Off";
// TRANSFERTS via SOCKET.IO
//*************************
var BWmaxF = 16.6666; //Bandwidth max Float ex16.666=16.66*100kHz for 2MHz Sampling Rate
GpredictOnOff = Gpredict.init();
OmnirigOnOff = Omnirig.init(ioS);
function ServersReceived(socket) {
    socket.on("CallConnect", (arg, callback) => { //Connect new User of Force Pilot User
        arg = JSON.parse(arg);
        var dataCPU = CPU.LastInfoCPU();
        SDRrx = dataCPU.SDRrx;
        SDRtx = dataCPU.SDRtx;
        CPUshort = dataCPU.CPUshort;
        arg.AccessKey = (arg.AccessKey + "").trim();
        arg.pseudo = (arg.pseudo + "").trim();
        Users.idxRefresh = 0; //To force a refresh of parameters sent to the SDR in a few second
        var AccesKeyF = "";
        try {
            AccesKeyF = fs.readFileSync('/remsdr/AccessKey.txt', 'utf8');
        } catch (e) {}
        AccesKeyF = AccesKeyF.trim();
        if (arg.ToLaunch == "RX") {
            if (arg.RXidx >= 0 && arg.AccessKey == AccesKeyF) { //Force Pilot Prioritary
                Users.list.push({
                    pseudo: arg.pseudo,
                    RXpilot: true,
                    TXpilot: true,
                    AccessKey: arg.AccessKey,
                    AccessOK: true,
                    lastM: Date.now(),
                    Tconnect: Date.now()
                });
                var k = Users.list.length - 1;
                for (var i = 0; i < k; i++) {
                    Users.list[i].RXpilot = false;
                    Users.list[i].TXpilot = false;
                }
            } else { //Create new user
                Users.list.push({
                    pseudo: arg.pseudo,
                    RXpilot: false,
                    TXpilot: false,
                    AccessKey: arg.AccessKey,
                    AccessOK: false,
                    lastM: Date.now(),
                    Tconnect: Date.now()
                });
                //Test if RX Pilot possible
                var k = Users.list.length - 1;
                if (AccesKeyF == arg.AccessKey) { //Accès RX et TX prioritaire
                    Users.list[k].AccessOK = true;
                }
                var NoPilot = true;
                for (var i = 0; i < k; i++) {
                    if (Users.list[i].RXpilot)
                        NoPilot = false;
                }
                if (NoPilot) {
                    Users.list[k].RXpilot = true;
                    if (Users.list[k].AccessOK)
                        Users.list[k].TXpilot = true //Can transmit
                }
            }
            var data = Launcher.RXlaunchGR(CPUshort, SDRrx); //Launch GNU Radio and define bandwidth according to sampling rate
            BWmaxF = data.BWmaxF;
            var response = JSON.stringify({
                idx: k,
                RXpilot: Users.list[k].RXpilot,
                TXpilot: Users.list[k].TXpilot,
                AccessOk: Users.list[k].AccessOK,
                SDRrx: SDRrx,
                SDRtx: SDRtx,
                BWmax: Math.floor(data.BWmaxF),
                CPUshort: data.CPUshort,
                SampRate: data.SampRate,
                GpredictOnOff: GpredictOnOff,
                OmnirigOnOff: OmnirigOnOff
            });
        }
        if (arg.ToLaunch == "TX") {
            Launcher.TXlaunchGR(CPUshort, SDRtx);
            var response = JSON.stringify({
                SDRtx: SDRtx
            });
        }
		if (arg.ToLaunch == "No") {
            //Create new user
                Users.list.push({
                    pseudo: arg.pseudo,
                    RXpilot: false,
                    TXpilot: false,
                    AccessKey: arg.AccessKey,
                    AccessOK: false,
                    lastM: Date.now(),
                    Tconnect: Date.now()
                });
                //Test if RX Pilot possible
                var k = Users.list.length - 1;
                if (AccesKeyF == arg.AccessKey) { //Accès RX et TX prioritaire
                    Users.list[k].AccessOK = true;
                }
                var NoPilot = true;
                
            var response = JSON.stringify({
                idx: k,
                RXpilot: Users.list[k].RXpilot,
                TXpilot: Users.list[k].TXpilot,
                AccessOk: Users.list[k].AccessOK,
                SDRrx: SDRrx,
                SDRtx: SDRtx,         
                CPUshort: CPUshort,
                GpredictOnOff: GpredictOnOff,
                OmnirigOnOff: OmnirigOnOff
            });
        }
        callback(response);
    });
    socket.on("UserStatus", (data, callback) => {
        data = JSON.parse(data);
        var k = data.MyIdx;
        if (k < Users.list.length) {
            Users.list[k].lastM = Date.now();
            var response = {
                RXpilot: Users.list[k].RXpilot,
                TXpilot: Users.list[k].TXpilot,
                AccessOk: Users.list[k].AccessOK,
                NbU: Users.list.length
            };
        } else {
            var response = {
                RXpilot: false,
                TXpilot: false,
                AccessOk: false,
                NbU: Users.list.length
            };
        }
        callback(JSON.stringify(response));
    });
    socket.on("UsersList", (data, callback) => {
        data = JSON.parse(data);
        var k = data.MyIdx;
        if (k < Users.list.length) {
            Users.list[k].lastM = Date.now();
        }
        var NbU = Users.list.length;
        var UL = [];
        for (var i = 0; i < NbU; i++) {
            UL.push([Users.list[i].pseudo, Users.list[i].RXpilot, Users.list[i].Tconnect, Users.list[i].lastM]);
        }
        var response = {
            NbU: NbU,
            UL: UL,
        };
        callback(JSON.stringify(response));
    });
    socket.on("choice_SDR_IF", (data, callback) => {
        data = JSON.parse(data);
        if (data.SDRrx) {
            CPU.SetSDR("RX", data.SDRrx);
            SDRrx = data.SDRrx;
        }
        if (data.SDRtx) {
            CPU.SetSDR("TX", data.SDRtx);
            SDRtx = data.SDRtx;
        }
        if (data.Gpredict)
            Gpredict.SetOn(data.Gpredict);
        if (data.Omnirig)
            Omnirig.SetOn(data.Omnirig);
        callback();
    });
    socket.on("CallRX", (data, callback) => { //Data to client High Rate
        data = JSON.parse(data);
        var k = data.MyIdx;
        if (k <= 0 && k < Users.list.length) {
            Users.list[k].lastM = Date.now();
        }
        callback(JSON.stringify(RX));
    });
    socket.on("CallRx", (data, callback) => { //Data to client Low Rate
        data = JSON.parse(data);
        var k = data.MyIdx;
        if (k <= 0 && k < Users.list.length) {
            Users.list[k].lastM = Date.now();
        }
        callback(JSON.stringify(Rx));
    });
    socket.on("PushRX", (data, callback) => { //Data from Pilot High Rate
        data = JSON.parse(data);
        var k = data.MyIdx;
        if (k <= 0 && k < Users.list.length) {
            Users.list[k].lastM = Date.now();
        }
        RX = data.RX;
        if (RX_Old.Fsdr != RX.Fsdr) { //To avoid a click every second. Each time the frequency is refreshed
            RXclientRpc.methodCall('set_Fsdr', [RX.Fsdr], function () {});
            RX_Old.Fsdr = RX.Fsdr;
        }
        if (RX_Old.Ffine != RX.Ffine) {
            var FreqFine = (Rx.invSpectra) ? -RX.Ffine : RX.Ffine; // Case of spectra inverted
            RXclientRpc.methodCall('set_Ffine', [FreqFine], function () {})
            RX_Old.Ffine != RX.Ffine;
        }
        var FRX_Gpredict = Gpredict.RX(Math.floor(Rx.Fcentral + RX.Ffine)); //Value F audio if necessary for Gpredict. Retur Doppler corrected
        Omnirig.RX(Math.floor(Rx.Fcentral + RX.Ffine)); //Value F audio RX
        callback(JSON.stringify({
                FRX_Gpredict: FRX_Gpredict
            }));
    });
    socket.on("PushRx", (data, callback) => { //Data from Pilot Low Rate
        data = JSON.parse(data);
        var k = data.MyIdx;
        if (k <= 0 && k < Users.list.length) {
            Users.list[k].lastM = Date.now();
        }
        Rx = data.Rx;
        var decim_LP = BWmaxF / Rx.idxBW;
        RXclientRpc.methodCall('set_decim_LP', [decim_LP], function () {});
        var M = (Rx.invSpectra) ? 1 - Rx.IdxModul : Rx.IdxModul; //LSB or USB inverted or not
        if (Rx.IdxModul == 5 || Rx.IdxModul == 6) {
            M = Rx.IdxModul - 5; //CW-LSB and CW-USB
            M = (Rx.invSpectra) ? 6 - Rx.IdxModul : M; //inversion CW-LSB and CW-USB
        }
        RXclientRpc.methodCall('set_Modulation', [M], function () {})
        RXclientRpc.methodCall('set_Squelch', [Rx.Squelch], function () {})
        RXclientRpc.methodCall('set_G1', [Rx.G1], function () {})
        RXclientRpc.methodCall('set_G2', [Rx.G2], function () {})
        RXclientRpc.methodCall('set_G3', [Rx.G3], function () {})
        callback(JSON.stringify());
    });
    socket.on("PushTX", (data, callback) => { //Data from Pilot High Rate
        data = JSON.parse(data);
        TX = data.TX;
        Users.lastTX_M = Date.now();
		
        if (TX_Old.Fsdr != TX.Fsdr || TX_Old.LNUC != TX.LNUC  || TX_Old.G1 != TX.G1 || TX_Old.G2 != TX.G2 || TX_Old.CTCSS != TX.CTCSS)  { //To avoid a click every second. Each time the frequency is refreshed
            TXclientRpc.methodCall('set_Fsdr', [TX.Fsdr], function () {});
            TXclientRpc.methodCall('set_LNUC', [TX.LNUC], function () {});
            if (Users.lastTX_Audio + 100 > Users.lastTX_M) { // TX On we set normal gains
                TXclientRpc.methodCall('set_G1', [TX.G1], function () {});
                TXclientRpc.methodCall('set_G2', [TX.G2], function () {});
            } 
			
            if (SDRtx == "SA818")
                TXclientRpc.methodCall('set_CTCSS', [TX.CTCSS], function () {});
			
            TX_Old = TX;
        }
        var FTX_Gpredict = Gpredict.TX(Math.floor(TX.Freq)); //Value F audio if necessary for Gpredict. Retur Doppler corrected

        callback(JSON.stringify({
                FTX_Gpredict: FTX_Gpredict
            }));
    });
    socket.on("AudioTX_Bytes", (data) => {
        var T = Date.now();
        if (Users.lastTX_Audio < T - 100) { //TX just switch on,we set normal gains
            TXclientRpc.methodCall('set_G1', [TX.G1], function () {});
            TXclientRpc.methodCall('set_G2', [TX.G2], function () {});
            Users.TX_On = true;
        }
        Users.lastTX_Audio = T;
        clientTX.send(data, 9005); //Array of 256 bytes via UDP
        CPU.ToggleOscil();
    });
    socket.on("CallTX", (data, callback) => { //Data to client High Rate
        data = JSON.parse(data);
        var response = {
            Fsdr: TX.Fsdr,
            TX_ON: Users.TX_ON
        }
        callback(JSON.stringify(response));
    });
    //RX Configuration
    socket.on("writeConfRX", (data, callback) => {
        fs.writeFile('/remsdr/data/ConfRX.txt', data, function (err) {});
    });
    socket.on("readConfRX", (callback) => {
        fs.readFile('/remsdr/data/ConfRX.txt', function (err, data) {
            callback(data.toString());
        });
    });
    //TX Configuration
    socket.on("writeConfTX", (data, callback) => {
        fs.writeFile('/remsdr/data/ConfTX.txt', data, function (err) {});
    });
    socket.on("readConfTX", (callback) => {
        fs.readFile('/remsdr/data/ConfTX.txt', function (err, data) {
            callback(data.toString());
        });
    });
    socket.on("ToOmnirig", (data) => {
        Omnirig.ToOmnirig(data);
    });
    socket.on("SetGPIOs", (data) => {
        CPU.SetGPIOs(data);
    });
}
//USERS CONNECTED
const Users = {
    list: [],
    lastTX_M: 0, //Last Message for TX
    lastTX_Audio: 0, //Last Message Audio
    TX_ON: false,
    idxRefresh: 0,
    manage: function () {
        //TX Management
        var T = Date.now() - 3000;
        if (Users.lastTX_Audio < T) { //TX is Off no recent Audio Data. Gains reduced to avoid any spurious transmission
            TXclientRpc.methodCall('set_G1', [0], function () {});
            TXclientRpc.methodCall('set_G2', [0], function () {});
            Users.TX_On = false;
        }
        //RX management
        var stillApilot = false;
        var k = Users.list.length;
        for (var i = 0; i < k; i++) {
            if (Users.list[i].lastM < T) {
                Users.list[i].RXpilot = false; //No More pilot as no recent message
                Users.list[i].TXpilot = false;
                Users.list[i].AccessOK = false;
            }
            if (Users.list[i].RXpilot)
                stillApilot = true;
        }
        if (!stillApilot && k > 0) {
            for (var i = 0; i < k; i++) {
                if (Users.list[i].lastM >= T) { //Look for a new RX Pilot
                    Users.list[i].RXpilot = true; //Create new RX pilot. Previous has stopped
                    stillApilot = true;
                    if (Users.list[i].AccessOK)
                        Users.list[i].TXpilot = true //Can transmit
                            i = k;
                }
            }
        }
        if (!stillApilot && Users.lastTX_M < T) { // No pilot. No TX in progress . We can stop signal processing
            Launcher.killer();
        }
        if (k > 0) {
            var T = Date.now() - 100000;
            var l = Users.list.length - 1;
            if (Users.list[l].lastM < T)
                Users.list.pop(); //Remove one user as no recent messages
        }
        //Periodic refreshed
        Users.idxRefresh = (1 + Users.idxRefresh) % 30;
        if (Users.idxRefresh == 4) {
            RX_Old = {}; //To guarantee equal configuration with the server
            TX_Old = {};
        }
    }
}
setInterval(Users.manage, 2000);
console.log('Server on port 80 in http and port 443 in https.CTRL+C to quit.');
