xvod
=======

Streaming and on-the-fly transcoding of any video file for Chrome, Firefox. etc.

Features
-----------
- Simple file management
- Support DLNA, push your video file to DLNA renders
- Support 4x,8x,16x playback speed(Need powerfull server)
- Seek by gesture on touchable device
- Auto probe subtitle file
- Seek by thumbnails
- Support PIP(If supported by browser)

Requirements
------------
- Tested on Linux.
- node.js (Tested on >0.8.14)
- ffmpeg (needs >v3, must be built with libx264, v2 not test, but should work)
- Chrome, Firefox or any browser with MSE, mp4, h264, aac support

Installation
------------
- git clone --recursive -b xvod ...
- cd hls-vod
- npm install

Running
------------------------------
- Make sure you have node.js and ffmpeg (>3.0) in PATH
- node hls-vod.js --root-path /mnt/videos
- Browse to http://localhost:4040/


Arguments
------------------
--root-path PATH - Root path allowed to read files in.

--transcoder-path PATH - Will use ffmpeg in PATH if not specified

For more arguments run it without arguments: node hls-vod.js


Compiling ffmpeg
----------------
You need a fairly recent version

hint:
./configure --enable-libx264 --enable-gpl --enable-nonfree
make -j9 && make install
