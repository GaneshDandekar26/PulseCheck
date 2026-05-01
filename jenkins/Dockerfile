FROM jenkins/jenkins:lts
USER root

# Install docker client statically to avoid apt repository issues on newer Debian versions
RUN curl -fsSL -O https://download.docker.com/linux/static/stable/x86_64/docker-24.0.9.tgz && \
    tar xzvf docker-24.0.9.tgz && \
    mv docker/docker /usr/local/bin/ && \
    rm -rf docker docker-24.0.9.tgz

USER jenkins

# Pre-install plugins
RUN jenkins-plugin-cli --plugins "docker-workflow sonar htmlpublisher"
