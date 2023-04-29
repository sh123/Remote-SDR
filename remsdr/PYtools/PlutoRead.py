#!/usr/bin/python3
# -*- coding: utf-8 -*-

import sys
import paramiko
argument = sys.argv[1]


if  argument=="Help" :
    client = paramiko.SSHClient()
    client.load_system_host_keys()

    client.set_missing_host_key_policy(paramiko.WarningPolicy())
    print("Connecting to Pluto...Wait\n")

    client.connect('192.168.2.1', 22, username='root', password='analog')
    stdin, stdout, stderr = client.exec_command('help')
    for line in stdout:
        print(line)
    client.close()
    print("-----------------<br>Done")

    

    
if  argument=="Reboot" :
    client = paramiko.SSHClient()
    client.load_system_host_keys()

    client.set_missing_host_key_policy(paramiko.WarningPolicy())
    print("Connecting to Pluto...Wait\n")

    client.connect('192.168.2.1', 22, username='root', password='analog')
    stdin, stdout, stderr = client.exec_command('reboot')
    print('Pluto reboot in progress')