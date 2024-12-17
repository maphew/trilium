@echo off
echo Removing WSL firewall rules...
gsudo netsh advfirewall firewall delete rule name="WSL" dir=in
gsudo netsh advfirewall firewall delete rule name="WSL" dir=out
gsudo netsh advfirewall firewall delete rule name="WSL_Network" dir=in
gsudo netsh advfirewall firewall delete rule name="WSL_Network_Out" dir=out

echo Restoring WSL network adapter MTU...
gsudo netsh interface ipv4 set interface 52 mtu=1500

echo Cleanup complete.
