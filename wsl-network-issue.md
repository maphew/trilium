# WSL Network Connectivity Issue Report

## Issue Summary
After installing Windows Update 24H2 WSL instances cannot access the internet despite the host Windows system having full connectivity. While DNS resolution works (can resolve domain names), actual network connectivity fails with 100% packet loss. This affects all WSL distributions and impacts both basic networking (ping) and container operations (Podman).

## Environment
- Windows Version: 10.0.26100.2314
- WSL Version: 2.3.26.0
- Kernel Version: 5.15.167.4-1
- WSLg Version: 1.0.65

## Reproduction Steps
1. Open any WSL distribution (example below with Alpine)
2. Try to ping an external IP:
   ```shell
   > wsl ping -c 3 microsoft.com
   PING microsoft.com (20.112.250.133): 56 data bytes

   --- microsoft.com ping statistics ---
   3 packets transmitted, 0 packets received, 100% packet loss
   ```
3. Observe 100% packet loss
4. Verify that DNS resolution works:
   ```shell
   > wsl nslookup microsoft.com
   Server:         10.255.255.254
   Address:        10.255.255.254:53

   Non-authoritative answer:
   Name:   microsoft.com
   Address: 20.236.44.162
   Name:   microsoft.com
   Address: 20.231.239.246
   Name:   microsoft.com
   Address: 20.76.201.171
   Name:   microsoft.com
   Address: 20.70.246.20
   Name:   microsoft.com
   Address: 20.112.250.133

   Non-authoritative answer:
   Name:   microsoft.com
   Address: 2603:1030:c02:8::14
   Name:   microsoft.com
   Address: 2603:1020:201:10::10f
   Name:   microsoft.com
   Address: 2603:1030:20e:3::23c
   Name:   microsoft.com
   Address: 2603:1030:b:3::152
   Name:   microsoft.com
   Address: 2603:1010:3:3::5b
   ```

5. Verify host Windows can ping the same addresses successfully
   ```powershell
   PS A:\> ping -n 3 microsoft.com

   Pinging microsoft.com [20.236.44.162] with 32 bytes of data:
   Reply from 20.236.44.162: bytes=32 time=63ms TTL=109
   Reply from 20.236.44.162: bytes=32 time=66ms TTL=109
   Reply from 20.236.44.162: bytes=32 time=67ms TTL=109

   Ping statistics for 20.236.44.162:
      Packets: Sent = 3, Received = 3, Lost = 0 (0% loss),
   Approximate round trip times in milli-seconds:
      Minimum = 63ms, Maximum = 67ms, Average = 65ms
   ```

## Current Network Configuration
- WSL Network Adapter: vEthernet (WSL (Hyper-V firewall))
- WSL NAT Gateway: 172.21.176.1
- WSL Network: 172.21.176.0/20
- WSL VM IP: 172.21.185.144

## Remedies Attempted

### 1. WSL Network Reset
- Executed `wsl --shutdown`
- Restarted WSL service
- Rebooted entire system
- Result: No change

### 2. Firewall Configuration
- Added explicit allow rules for WSL executable
- Added allow rules for all WSL network traffic
- Verified firewall profiles (Domain, Private, Public all set to BlockInbound,AllowOutbound)
- Result: No change

### 3. Network Configuration
- Attempted to reset WSL network settings by removing registry entries:
  - HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Lxss\NatGatewayIpAddress
  - HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Lxss\NatNetwork
- Adjusted MTU on WSL network adapter to match other interfaces (1280)
- Result: No change

### 4. Basic Network Verification
- Confirmed routing table is correct (default route via 172.21.176.1)
- Verified network interface configuration
- Confirmed WSL can't reach its own gateway (100% packet loss to 172.21.176.1)

## Current Situation
- Host Windows networking works perfectly
- WSL instances can resolve DNS names but cannot transmit/receive packets
- All WSL distributions affected
- Problem persists across WSL restarts and system reboots
- Network configuration appears correct but packets are not reaching/returning from the gateway

## Best Guess at Root Cause
The issue appears to be at the network virtualization layer between Windows and WSL. Given that:
1. DNS resolution works (suggesting some level of network connectivity)
2. Packets can't reach the WSL NAT gateway (172.21.176.1)
3. The problem affects all WSL distributions

The most likely causes are:
1. A problem with the WSL NAT implementation in Windows
2. A conflict with another network virtualization component (possibly Hyper-V or another virtualization product)
3. Corruption in the WSL network stack that persists across restarts

## Additional Information
- The system has multiple network adapters including Tailscale (MTU 1280). Tailscale is disconnected.
- Check Point VPN client is installed but not connected

## Logs and Diagnostics
Please provide instructions for collecting any specific logs or running diagnostic commands that would be helpful for troubleshooting.
