/*
  Remote SDR
  Interface Serial-USB 
  - Frequency Tuning
  - TX/RX state change
  - CW Key
  F1ATB 26 December 2021
*/

// digital pin 2 and 3  has a luminosity sensor attached to them.
int Led_A = 2;
int Led_B = 3;
// digital pin 4 has a pusbutton attached to it
int pushButton = 4;
int OldButton = 1;

//CW Key
int LeftKey = 5;
int RightKey = 6;
int OldLeft = 1;
int OldRight = 1;

int Delay = 1;

int total=0;
// the setup routine runs at start up
void setup() {
  // initialize serial communication at 115200 bits per second:
  Serial.begin(115200);
  // make the pushbutton's pin an input:
  pinMode(Led_A, INPUT_PULLUP);
  pinMode(Led_B, INPUT_PULLUP);
  pinMode(pushButton, INPUT_PULLUP);
  pinMode(LeftKey, INPUT_PULLUP);
  pinMode(RightKey, INPUT_PULLUP);
  attachInterrupt(digitalPinToInterrupt(Led_A), A_Rising, RISING) ;
  
}

// the loop routine runs over and over again forever to read the button and the morse key:
void loop() {
    Delay = 1;
   
    // Read PushButton
    int Button = digitalRead(pushButton);
    if (OldButton != Button) {
        Serial.println("B"+String(Button));
        OldButton = Button;
        Delay = 10;
    }

    // Read LeftKey
    int kLeft = digitalRead(LeftKey);
    if (OldLeft != kLeft) {
        Serial.println("L"+String(kLeft));
        OldLeft = kLeft;
        Delay = 2;
    }
    // Read RighttKey
    int kRight = digitalRead(RightKey);
    if (OldRight != kRight) {
        Serial.println("R"+String(kRight));
        OldRight = kRight;
        Delay = 2;
    }
    // Total is the sum of impulsions received from the rotating knob
    if (total<0){
       Serial.println("D"+String(total));
       total =0;
       Delay = 10;
    }
    if (total>0){
       Serial.println("U"+String(total));
       total =0;
       Delay = 10;
    }
    delay(Delay);        // delay in between reads for stability
}
void A_Rising() { // Rotating Knob interruption
    int LedStateB = digitalRead(Led_B);
    if (LedStateB ==0){
      total--;
    } else {
      total++;
    }
}
