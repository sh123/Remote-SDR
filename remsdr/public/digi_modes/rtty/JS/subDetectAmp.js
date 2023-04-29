// Bit Detection on amplitude comparaison at the output of the bandpass filters
const DetectAmp = {
    On:true,
	Disp: "displayAmp",
    Text: "textAmp",
    IdxInt: 0,
    DispOut: true,
    Plot: true,
    IdxPlot: 0,
    Xplot: 0,
    Yplot: 0,
    Yvalue: 0,
    MaxPlot: 1e-10,
    FiltreOut: [],
    ValueOut: [],
    Value: 0,
    PLL: 0,
    Bit: 0,
    Byte: 0,
	Words:"",
    shift: false,
    texte: "",
    H: 1,
    W: 1,
    DrawV: false,
    DrawF: false,
    IdxStart: 0,
    RCfiltre: 0,
	Squelch:false,
	Tsquelch:0,
	DetectOn:function(){
		this.On=!this.On;
		$("#RXzoneAmp").css("display",this.On? "block":"none");
	},
    Detect: function () {
		if(this.On){
			var FilterLength = modes[RTTYstore.idxMode].Nstep;
			var IdxLoadPF = ShortInt.IdxLoadPF;
			while (this.IdxInt != IdxLoadPF) {
				this.IdxInt = (this.IdxInt + 1) % ShortInt.Size;
				var FiltreOut = 0
					for (var i = 1; i <= FilterLength; i++) {
						var j = (this.IdxInt - i + ShortInt.Size) % ShortInt.Size;
						FiltreOut += ShortInt.PreFiltre[j]; //Long integration adapted to pulse length
					}
					this.FiltreOut[this.IdxInt] = FiltreOut;
				j = (this.IdxInt + ShortInt.Size - 1) % ShortInt.Size; //-1
				if (FiltreOut * this.FiltreOut[j] <= 0) { //Signe change at middle of the bit
					if (this.PLL < FilterLength / 2 - 0.5)
						this.PLL = this.PLL + 1; //En retard
					if (this.PLL > FilterLength / 2 + 0.5)
						this.PLL = this.PLL - 1; //En avance
					//if(ShortInt.Bit== -1) ShortInt.PLL =Math.floor(FilterLength / 2 + 0.5);
				}
				if (this.PLL == 0) { //Take the result
					this.Value = (FiltreOut > 0) ? 1 : 0;
					if (this.Bit == -2 && this.Value == 1)
						this.Bit = -1; //1 before start bit
					if (this.Bit == -1 && this.Value == 0) {
						this.Bit = 0; //Start bit arrives
						this.Byte = 0;
					}
					if (this.Bit > 0 && this.Bit < 6) {
						this.Byte |= this.Value << (this.Bit - 1);
					}
					if (this.Bit == 6 && this.Value == 1) { // Good result
						this.PLL = this.PLL + Math.floor(FilterLength / 2 + 0.6); // Half bit at the end
					}
					if (this.Bit == 6 && this.Value == 0) {
						this.Bit = -2; // Bad synchro, wait for 1
						this.PLL = this.PLL + Math.floor(FilterLength / 2 + 0.6); // Half bit at the end
					}
					if (this.Bit == 7 && this.Value == 1) { //End Good syncro
						this.Bit = -1; //Wait for next Start=0
						var Car = Baudot.byteToCar(this.shift, this.Byte);
						if (!RTTY_TX.TX_ON || RTTY_TX.Fduplex) {
							switch (this.Byte) {
							case 0x1F:
								this.shift = false; //letter
								break;
							case 0x1B:
								this.shift = true; //Number
								break;
							default:
								this.Words = this.Words + Car;
							}
						}
					}
					if (this.Bit == 7 && this.Value == 0) {
						this.Bit = -2; //Bad synchro, wait for 1
					}
					if (this.Bit >= 0)
						this.Bit += 1;
				}
				this.ValueOut[this.IdxInt] = this.Value;
				this.PLL = (this.PLL + 1) % FilterLength;
			}
			
			//Squelch
			var T=Date.now();
			var Idx = this.IdxPlot;
			while (Idx != this.IdxInt) {
				Idx = (1 + Idx) % ShortInt.Size;
				var Fo = this.FiltreOut[Idx];
				this.MaxPlot =  0.99 *Math.max(Math.abs(Fo), this.MaxPlot);
				var out = (Fo > 0.95 * this.MaxPlot ) ? true : false;
				this.RCfiltre = (out) ? 1 + this.RCfiltre : 0.9*this.RCfiltre;
				if (this.RCfiltre>15) this.Tsquelch=T;
			}
			
			if ((T-this.Tsquelch)<1000 || !this.Squelch) {
				this.texte=this.texte+this.Words;
				this.CarPrint();
			}
			this.Words="";
			//Plot last result
			if (this.Plot) {
				var canvasDetect = document.getElementById("Can" + this.Disp);
				var ctx = canvasDetect.getContext("2d");
				ctx.lineWidth = 1;
				//Output Value
				ctx.beginPath();
				ctx.strokeStyle = "Green";
				var X0 = this.Xplot;
				var Idx = this.IdxPlot;
				while (Idx != this.IdxInt) {
					var V0 = this.ValueOut[Idx % ShortInt.Size];
					Idx = (1 + Idx) % ShortInt.Size;
					var V = this.ValueOut[Idx];
					if (V0 == 1 && V == 0) {
						if (!this.DrawV)
							this.IdxStart = Idx;
						this.DrawV = true; //synchro start
					}
					if (this.DrawV) {
						ctx.moveTo(X0, this.Yvalue);
						X0 += 2;
						this.Yvalue = 1 + 0.95 * (1 - V) * this.H;
						ctx.lineTo(X0, this.Yvalue);
					}
				}
				ctx.stroke();
				//Output Detector - Long Integration
				ctx.beginPath();
				ctx.strokeStyle = "Orange";
				var X0 = this.Xplot;
				var Idx = this.IdxPlot;
				while (Idx != this.IdxInt) {
					var oldF = this.FiltreOut[Idx]
						Idx = (1 + Idx) % ShortInt.Size;
					if (this.IdxStart == Idx && this.DrawV)
						this.DrawF = true;
					if (this.DrawF) {
						ctx.moveTo(X0, this.Yplot);
						var Fo = this.FiltreOut[Idx];
						X0 += 2;
						this.Yplot = (0.5 - 0.49 * Fo / this.MaxPlot) * this.H;
						ctx.lineTo(X0, this.Yplot);                 
					}
				}
				ctx.stroke();

				this.Xplot = X0;
				this.IdxPlot = Idx;
				if (this.Xplot > this.W) {
					this.Xplot = 0;
					ctx.clearRect(0, 0, this.W, this.H);
					var X = 0;
					ctx.beginPath();
					ctx.strokeStyle = '#ff0';
					var step_1baud = 2 * modes[RTTYstore.idxMode].Nstep;
					while (X < this.W) {
						ctx.moveTo(X, this.H);
						ctx.lineTo(X, 0.9 * this.H)
						X += step_1baud;
					}
					ctx.stroke();
					this.DrawV = false;
					this.DrawF = false;
				}
			}
		}
    },
    CarPrint: function () {
        while (this.texte.length > 500) {
            var p = 1 + this.texte.indexOf(" ");
            p = Math.max(p, 1);
            this.texte = this.texte.substr(p);
        }
        var ligne = this.texte.split("\n");
        if (ligne.length > 50) {
            var p = 1 + this.texte.indexOf("\n");
            this.texte = this.texte.substr(p);
        }
        $("#" + this.Text).text(this.texte);
       
    },
	
    TXcar: function (c) {
        this.texte = this.texte + c;
        this.CarPrint();
    },
    DispPlot: function () {
        this.Plot = !this.Plot;
        $("#displayAmp").css("display", (this.Plot) ? "block" : "none");
        $(".text_env_A").css("height", (this.Plot) ? "120px" : "170px");
    },
    Resize: function () {
        this.H = $("#" + this.Disp).innerHeight();
        this.W = $("#" + this.Disp).innerWidth();
        $("#" + this.Disp).html('<canvas class="Pabsolute" id="Can' + this.Disp + '" width="' + this.W + '" height="' + this.H + '" ></canvas>');
    }
}
