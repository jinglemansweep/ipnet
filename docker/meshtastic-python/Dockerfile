ARG base_image="python"
ARG base_tag="3.12-slim"

FROM ${base_image}:${base_tag}

RUN python -m pip install --upgrade pip
RUN python -m venv /venv && \
    /venv/bin/pip install --upgrade pytap2 && \
    /venv/bin/pip install --upgrade meshtastic

ENTRYPOINT ["/venv/bin/meshtastic"]
