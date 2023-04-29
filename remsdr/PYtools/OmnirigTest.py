#!/usr/bin/python3           # This is client.py file


import socket
import websockets
import time

print("Start OmniRig Test for 10s.")
print("Listen on port 8008.")
print("Messages from Omnirig are passed to the RX Raspberry/Orange pi and returned here to the web browser.")
print("Messages as 'INIT;', 'IF;', 'TX;' should be displayed.")
print("After 10s the port 8008 is released to avoid any conflict with Remote SDR main process.") 


Port =  8008
addrClientWeb="";
# Créer un socket UDP coté client

sout = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
sin = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
sin.bind(("0.0.0.0",Port))
sin.settimeout(0)

T0=time.time()+10
Info="No data received."
while time.time()<T0:
        try:
             data, addr = sin.recvfrom(1024) 
             message=data.decode('utf8')
             addrClientWeb=addr[0]
             print(message)
             Info="";
             if message=="IF;" :
                sout.sendto(str.encode("IF007010000;"), (addrClientWeb,Port))
             else :
                sout.sendto(str.encode(";"), (addrClientWeb,Port))
        except :
            
            pass
       
            
    
sin.close()   
print("<br>"+Info)
print("This test the link between OmniRig and Remote SDR. It doesn't test the link between any application and Omnirig.")