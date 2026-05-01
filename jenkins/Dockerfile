FROM jenkins/jenkins:lts
USER root

# Install docker client statically to avoid apt repository issues on newer Debian versions
RUN curl -fsSL -O https://download.docker.com/linux/static/stable/x86_64/docker-24.0.9.tgz && \
    tar xzvf docker-24.0.9.tgz && \
    mv docker/docker /usr/local/bin/ && \
    rm -rf docker docker-24.0.9.tgz

# Install Node.js (required for npm ci and npm test)
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs

USER jenkins

# Pre-install plugins
RUN jenkins-plugin-cli --plugins "docker-workflow sonar htmlpublisher"
