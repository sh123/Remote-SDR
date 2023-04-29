
const Plot_XY = {
    H: 1,
    W: 1,
    Cpt: 0,
    Max: 1e-10,
    Plot: function () {
        this.Max = Math.max(Math.abs(ShortInt.S), Math.abs(ShortInt.M), this.Max);
        var canvasXY1 = document.getElementById("XY1");
        var canvasXY0 = document.getElementById("XY0");
        var ctx1 = canvasXY1.getContext("2d");
        var ctx0 = canvasXY0.getContext("2d");
        if (this.Cpt == 500)
            ctx0.clearRect(0, 0, this.W, this.H);
        if (this.Cpt == 0)
            ctx1.clearRect(0, 0, this.W, this.H);
        if (this.Cpt > 500) {
            var ctx = ctx0;
        } else {
            var ctx = ctx1;
        }
        ctx.strokeStyle = "white";
        ctx.lineWidth = 1;
        //Output Detector
        ctx.beginPath();
        var X = (1 + ShortInt.S / this.Max) * this.W / 2;
        var Y = (1 + ShortInt.M / this.Max) * this.H / 2;
        ctx.moveTo(X + Math.sign(ShortInt.S), Y + Math.sign(ShortInt.M));
        ctx.lineTo(X, Y);
        ctx.stroke();
        this.Max = 0.999 * this.Max;
        this.Cpt = (this.Cpt + 1) % 1000;
    },
    Resize: function () {
        this.H = $("#XY").innerHeight();
        this.W = $("#XY").innerWidth();
        var Canvas = '<canvas id="XY0" class="Pabsolute" width="' + this.W + '" height="' + this.H + '" ></canvas>';
        Canvas = Canvas + '<canvas id="XY1" class="Pabsolute" width="' + this.W + '" height="' + this.H + '" ></canvas>';
        $("#XY").html(Canvas);
    }
}
const Plot_FFT = {
    H: 10,
    W: 10,
    Line: 0,
    Bloc: true,
    Plot: function () {
        if (RTTY_RXnode.source != null && RTTY_RXnode.detectS != null && RTTY_RXnode.detectM != null) {
            var buffer_length = RTTY_RXnode.analFFT.frequencyBinCount;
            var array_freq_domain = new Uint8Array(buffer_length);
            RTTY_RXnode.analFFT.getByteFrequencyData(array_freq_domain);
            var Sl = Math.floor(2 * 4000 * array_freq_domain.length / 10000);
            if (this.Line == 0) {
                this.Bloc = !this.Bloc;
            }
            var L = this.H - this.Line - 1;
            var p0 = -L + "px";
            var p1 = -L + this.H + "px";
            if (this.Bloc) {
                $("#waterFFT0").css("top", p0);
                $("#waterFFT1").css("top", p1);
            } else {
                $("#waterFFT0").css("top", p1);
                $("#waterFFT1").css("top", p0);
            }
            var canvasWaterfall0 = document.getElementById("waterFFT0");
            var ctxW0 = canvasWaterfall0.getContext("2d");
            var canvasWaterfall1 = document.getElementById("waterFFT1");
            var ctxW1 = canvasWaterfall1.getContext("2d");
            if (this.Bloc) {
                var imgData = ctxW0.getImageData(0, L, this.W, 1);
            } else {
                var imgData = ctxW1.getImageData(0, L, this.W, 1);
            }
            var A_FFT = []
            for (var k = 0; k <= this.W; k++) {
                var i = Math.floor(k * Sl / this.W);
                var i0 = Math.max(Math.min(i, 20), 0, i - 20);
                var i1 = Math.min(Sl, i + 20, Math.max(i + 1, Sl - 20));
                var sector = array_freq_domain.slice(i0, i1);
                var min = Math.min(...sector);
                A_FFT.push(array_freq_domain[i] - min); //High pass spatial filter
            }
            var max = Math.max(1, ...A_FFT);
            var k = 0;
            for (var i = 0; i < this.W; i++) {
                var A = Math.floor(300 * A_FFT[i] / max);
                A = Math.min(A, 300); //300 different amplitudes
                imgData.data[k] = Cpalette[A][0]; //Red
                imgData.data[k + 1] = Cpalette[A][1]; //Green
                imgData.data[k + 2] = Cpalette[A][2]; //Blue
                imgData.data[k + 3] = 255;
                k = k + 4;
            }
            if (this.Bloc) {
                ctxW0.putImageData(imgData, 0, L); //On modifie la ligne L
            } else {
                ctxW1.putImageData(imgData, 0, L);
            }
            this.Line = (this.Line + 1) % this.H;
        }
    },
    Resize: function () {
        this.H = $("#waterFFT").innerHeight();
        this.W = $("#waterFFT").innerWidth();
        var Canvas = '<canvas id="waterFFT0" class="Pabsolute" width="' + this.W + '" height="' + this.H + '" ></canvas>';
        Canvas = Canvas + '<canvas id="waterFFT1" class="Pabsolute" width="' + this.W + '" height="' + this.H + '" ></canvas>';
        Canvas = Canvas + '<canvas id="waterLabel" class="Pabsolute" width="' + this.W + '" height="' + this.H + '" ></canvas>';
        Canvas = Canvas + '<input type="button"  id="waterbut" onclick="Plot_FFT.Color();" class="waterBut coral">';
		$("#waterFFT").html(Canvas);
		WaterColor(Water.water_col);
    },
    Freq_Response: function () {
        var H = Math.floor($("#waterFFT").innerHeight());
        var W = Math.floor($("#waterFFT").innerWidth());
        var canvas = document.getElementById("waterLabel");
        var ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, W, H);
        ctx.lineWidth = 1;
        ctx.strokeStyle = 'white';
        ctx.fillStyle = 'white';
        ctx.font = "12px Arial";
        ctx.beginPath();
        var FMX = 4000 / 1000;
        for (var f = 0; f < FMX; f++) {
            var x = W * f / FMX;
            ctx.moveTo(x, H);
            ctx.lineTo(x, 0.95 * H);
            ctx.fillText(f + "kHz", x, 0.95 * H);
        }
        ctx.fillText("dB", 5, 0.1 * H);
        ctx.stroke();
        ctx.beginPath();
        ctx.setLineDash([2, 10]);
        for (var i = 1; i < 4; i++) {
            var Y = H * i / 4;
            ctx.moveTo(0, Y);
            ctx.lineTo(W, Y);
            ctx.fillText(-i * 10, 6, Y);
        }

        ctx.stroke();
        ctx.setLineDash([2, 4]);
        ctx.beginPath();
        ctx.strokeStyle = 'yellow';
        x = RTTY_RX.Fspace * W / 4000;
        ctx.moveTo(x, H);
        ctx.lineTo(x, 0);
        x = RTTY_RX.Fmark * W / 4000;
        ctx.moveTo(x, H);
        ctx.lineTo(x, 0);
        ctx.stroke();
		ctx.setLineDash([]);
        ctx.beginPath();
        ctx.strokeStyle = 'green';
        x = RTTY_TX.Fmark * W / 4000;
        ctx.moveTo(x, H);
        ctx.lineTo(x, 0.9*H);
        ctx.stroke();
		 ctx.beginPath();
        ctx.strokeStyle = 'red';
        x = RTTY_TX.Fspace * W / 4000;
        ctx.moveTo(x, H);
        ctx.lineTo(x, 0.9*H);
        ctx.stroke();
		if (RTTY_RXnode.filterBPm){
			var frequencyArray = new Float32Array(200);
			for (let i = 0; i < 200; i++) {
				frequencyArray[i] = (i + 1) * 20; //4KHZ band
			}
			var magResponseOutputBPm = new Float32Array(200);
			var magResponseOutputBPs = new Float32Array(200);
			var magResponseOutputNotch = new Float32Array(200);
			var phaseResponseOutput = new Float32Array(200);
			RTTY_RXnode.filterNotch.getFrequencyResponse(frequencyArray, magResponseOutputNotch, phaseResponseOutput);
			RTTY_RXnode.filterBPm.getFrequencyResponse(frequencyArray, magResponseOutputBPm, phaseResponseOutput);
			var TableMag = [];
			for (let i = 0; i < 200; i++) {
				var Amplitude = magResponseOutputBPm[i] ; 
				if(RTTY_RXnode.notchOn){
					Amplitude = Amplitude * magResponseOutputNotch[i]; 
				}
				TableMag.push(20 * Math.log10(Amplitude));
			}
			ctx.beginPath();
			ctx.strokeStyle = 'green';
			ctx.moveTo(0, H);
			for (let i = 0; i < 200; i++) {
				var Y = (-TableMag[i]) * H / 40;
				var X = (i + 1) * 20 * W / 4000;
				ctx.lineTo(X, Y);
			}
			ctx.stroke();
			RTTY_RXnode.filterBPs.getFrequencyResponse(frequencyArray, magResponseOutputBPs, phaseResponseOutput);
			var TableMag = [];
			for (let i = 0; i < 200; i++) {
				var Amplitude = magResponseOutputBPs[i];
				if(RTTY_RXnode.notchOn){
					Amplitude = Amplitude * magResponseOutputNotch[i];
				}
				
				TableMag.push(20 * Math.log10(Amplitude));
			}
			ctx.beginPath();
			ctx.strokeStyle = 'red';
			ctx.moveTo(0, H);
			for (let i = 0; i < 200; i++) {
				var Y = (-TableMag[i]) * H / 40;
				var X = (i + 1) * 20 * W / 4000;
				ctx.lineTo(X, Y);
			}
			ctx.stroke();
		}

    },
	Color:function(){
		Water.water_col =(1+Water.water_col)%Colors.length;
		WaterColor(Water.water_col);
	}
}
