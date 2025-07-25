---
title: "Meshtastic"
date: 2025-07-25T15:17:45+01:00
draft: false
---

The IPNet network previously ran on the [Meshtastic](https://meshtastic.org/) platform, which is a popular open-source project for creating long-range mesh networks using LoRa devices. However, the network has since transitioned to the [MeshCore](https://meshcore.co.uk/) platform, which offers enhanced features and support.

We will maintain this page for reference, but please note that the information may be outdated.

## Meshtastic CLI Docker Image

The standard Meshtastic Python CLI tool is available as a Docker image, hosted on [GitHub Container Registry](https://ghcr.io/jinglemansweep/meshtastic-cli). To run, use the following examples:

    docker run -it --rm --device /dev/ttyACM0 ghcr.io/jinglemansweep/meshtastic-cli:latest --port /dev/ttyACM0 --export-config

The above command passes the `/dev/ttyACM0` USB device into the container, and then runs the standard `meshtastic` CLI tool with the `--port /dev/ttyACM0 --export-config` arguments to specify the USB device passed in and to export the current device configuration.
