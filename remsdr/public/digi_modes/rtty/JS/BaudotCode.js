const Baudot={
	RTTYLetters : [ "<", "E", "\n", "A", " ", "S", "I", "U", "\n", "D", "R", "J", "N", "F", "C", "K", "T", "Z", "L", "W", "H", "Y", "P", "Q", "O", "B", "G", "^", "M", "X", "V", "^" ],
	RTTYSymbols : [ "<", "3", "\n", "-", " ", ",", "8", "7", "\n", "$", "4", "#", ",", ".", ":", "(", "5", "+", ")", "2", ".", "6", "0", "1", "9", "7", ".", "^", ".", "/", "=", "^" ],
	byteToCar:function(shift,byte) {
		switch (byte) {
			case 0x1F:
				return "";
			case 0x1B:
				return "";
			default:
				return shift ? this.RTTYSymbols[byte] : this.RTTYLetters[byte]
		}
	},
	CarToByte:function(C){
		return Math.max(0,this.RTTYLetters.indexOf(C),this.RTTYSymbols.indexOf(C));
	}
}