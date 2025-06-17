I want to build a web application that allows me to have a multi-camera setup, so that I can place cameras in several locations in my apartment, connected by various different phones that I have, all with web browsers open to a page.

There will be an interface which shows all the video feeds. There will be a couple of different views, which will allow the videos to be displayed equal size, or for the one with the loudest audio to be the featured one, with all the other videos rendered slightly smaller.

Technology-wise, I would like this to use WebRTC.

I don't need authenticaiton on this at all.

I want to get this up and working as quickly as possible, so willing to use open source packages to help with this.

This doesn't need to use different rooms, it can just be a single room that everyone joins automatically.

There needs to be a concept of grouping the videos together, so even though there is no authentication, there needs to be some kind of selection on which group to add the video source to. This could be automatic based on the WAN ip address of the device.

