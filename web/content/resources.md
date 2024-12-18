---
title: "Resources"
date: 2024-12-14T19:13:11Z
draft: false
---

## Meshtastic CLI Docker Image

The standard Meshtastic Python CLI tool is available as a Docker image, hosted on [GitHub Container Registry](https://ghcr.io/jinglemansweep/meshtastic-cli). To run, use the following examples:

    docker run -it --rm --device /dev/ttyACM0 ghcr.io/jinglemansweep/meshtastic-cli:latest --port /dev/ttyACM0 --export-config

The above command passes the `/dev/ttyACM0` USB device into the container, and then runs the standard `meshtastic` CLI tool with the `--port /dev/ttyACM0 --export-config` arguments to specify the USB device passed in and to export the current device configuration.
