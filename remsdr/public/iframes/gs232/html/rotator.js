var host = window.location.hostname;
var port = '64000';
var socket = new WebSocket('ws://' + host + ":" + port);

socket.onopen = function () {
    console.log("Connected!");
    $("#connection_status").text("Connected");
    switchClasses("badge-dark", "badge-success", "connection_status");
}

socket.onerror = function (error) {
    $("#connection_status").text("ERROR");
    switchClasses("badge-dark", "badge-danger", "connection_status");
}

socket.onmessage = function (msg) {
//    console.log("Received: ", msg);
    processMessage(msg.data);
}

socket.onclose = function () {
    console.log("Disconnected!");
    $("#connection_status").text("Disconnected");
    switchClasses("badge-danger", "badge-dark", "connection_status");
    switchClasses("badge-success", "badge-dark", "connection_status");
}

function switchClasses(before, after, element) {
    $("#" + element).removeClass(before);
    $("#" + element).addClass(after);
}

function resetButtonClass() {
    $("#ant_ports").find('button').each(function () {
        $(this).removeClass();
        $(this).addClass('btn');
    });
}

function processMessage(msg){
//	console.log(msg);
    var lines = msg.split("\n");

    for (i=0;i<lines.length;i++) {
        var data = lines[i].split("=");

	if (data[0]=="AZ") {
	    $("#azimuth").text(data[1]);
	}
	if (data[0]=="EL") {
	    $("#elevation").text(data[1]);
	}
    }
}

function doCmd(cmd){
    const commands = ['','L','A','R', 'U', 'E', 'D'];
    socket.send(commands[cmd] +"\n");
}

function goAzimuth(){
    var goto = $('#azimuth_value').val();
    if(!goto || isNaN(goto) || goto > 360 || goto < 0 ){
        alert("Invalid azimuth value!\nAzimuth mut be an integer between 0 and 360");
        return;
    } else {
    	if (goto<100) goto = '0'+goto;
        socket.send('M'+ goto +"\n");
    }
}
function goElevation(){
    var goto = $('#azimuth_value').val();
    var goto2 = $('#elevation_value').val();
    if(!goto || isNaN(goto) || goto > 360 || goto < 0 ){
        alert("Invalid azimuth value!\nAzimuth mut be an integer between 0 and 360");
        return;
    }
    if(!goto2 || isNaN(goto2) || goto2 > 180 || goto2 < 0 ){
        alert("Invalid elevation value!\nElevation mut be an integer between 0 and 180");
        return;
    }
    if (goto<100) goto = '0'+goto;
    if (goto2<100) goto2 = '0'+goto2;

    socket.send('W'+ goto + ' ' + goto2 +"\n");
}
