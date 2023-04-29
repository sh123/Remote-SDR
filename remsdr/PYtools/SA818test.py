#!/usr/bin/python3

#Test Serial Link with SA818 module connected to Orange Pi Zero 2
import os
import sys
import serial
import subprocess


def clear_print(x) :
    x = x.replace('\\','')
    print( x.replace('rn',''))

CPU_Model = ""
Zero2 = False
CPU = subprocess.run(['lscpu'], stdout=subprocess.PIPE) # which cpu
CPU.stdout.decode('utf-8')
if CPU.stdout.find(b"armv7l")>0 : # It' a Raspberry 4
    CPU_Model ="CPU_Model = 'Raspberry PI';"
    
    
if CPU.stdout.find(b"aarch64")>0 : # It' an Orange PI One plus or Zero 2
    CPU_Model ="CPU_Model = 'Orange PI One Plus';"
    if CPU.stdout.find(b"1512.0")>0 :
        CPU_Model ="CPU_Model = 'Orange PI Zero 2';"
        Zero2 = True

if Zero2 :        
    #serial bus to SA818
    uartSA818 = "/dev/ttyS5"
    writeToSA818 = b'' 
    SA818 = serial.Serial(uartSA818, 9600, timeout=1)
    writeToSA =bytes('AT+DMOCONNECT','ascii')
    SA818.write(writeToSA  + b'\r\n' )   
    data = SA818.readline()
    if data:
        clear_print( str(data))
else :
    print( "Available only for Orange Pi Zero 2 processor and not for :"+CPU_Model)
        

