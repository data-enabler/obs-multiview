# OBS-Multiview

If you're trying to create a custom multiview using an OBS scene, this overlay will add automatically-updating frames and labels to sources in the scene.

This currently uses OBS-Websocket 4.x due to [a bug in OBS-Websocket 5.x that prevents tracking of scene item transforms](https://github.com/obsproject/obs-websocket/issues/1295).
