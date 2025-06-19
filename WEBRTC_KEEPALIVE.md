# WebRTC Mobile Video Freeze Fix: Keep-Alive Data Channel

## Problem
On some mobile devices, video receiving in the WebRTC video chat app would freeze or become unstable after a few seconds, even though sending video worked fine. This issue did not occur on desktop browsers.

## Cause
Mobile browsers and some WebRTC implementations may aggressively suspend or throttle background connections, especially if they detect inactivity. If there is no ongoing signaling, data, or API activity, the browser or OS may:
- Throttle or pause the WebRTC connection
- Close NAT/firewall bindings
- Garbage collect the connection

This can result in video or audio freezing, even if the connection appears established.

## Solution: Keep-Alive Data Channel
A dedicated WebRTC data channel named `keepalive` is created for each peer connection. Every 5 seconds, a small 'ping' message is sent over this channel. This regular activity:
- Signals to the browser and OS that the connection is still active
- Helps keep NAT/firewall bindings open
- Prevents aggressive power-saving or backgrounding from suspending the connection

This approach is independent of any stats polling or UI updates, and is a common workaround in real-time media applications.

## Why Not Just Use getStats?
While polling `getStats()` can also keep the connection alive, it is not its intended purpose and may not be reliable across all browsers or future updates. Using a data channel for explicit keep-alive is a more robust and standards-compliant solution.

## Summary
- The keep-alive data channel prevents mobile video freezing by maintaining regular activity on the WebRTC connection.
- This fix is especially important for mobile browsers and devices with aggressive backgrounding or power-saving features.
- The solution is lightweight and does not interfere with media or UI logic.
