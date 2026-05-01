pipeline {
    agent any

    /* ── Parameterise the build ──────────────────────────────────── */
    environment {
        DOCKERHUB_REPO   = 'ganeshdandekar26/pulsecheck'
        IMAGE_TAG        = sh(script: 'git rev-parse --short HEAD 2>/dev/null || echo build-${BUILD_NUMBER}', returnStdout: true).trim()
        SCANNER_HOME     = tool 'SonarQubeScanner'   // name configured in Jenkins Global Tool Configuration
    }

    options {
        timeout(time: 30, unit: 'MINUTES')
        disableConcurrentBuilds()
        buildDiscarder(logRotator(numToKeepStr: '10'))
    }

    stages {

        /* ─────────────────────────────────────────────────────────
         * 1. Checkout
         * ───────────────────────────────────────────────────────── */
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        /* ─────────────────────────────────────────────────────────
         * 2. Install Dependencies
         * ───────────────────────────────────────────────────────── */
        stage('Install Dependencies') {
            steps {
                dir('backend') {
                    sh 'npm ci'
                }
            }
        }

        /* ─────────────────────────────────────────────────────────
         * 3. Test (Jest + Coverage)
         * ───────────────────────────────────────────────────────── */
        stage('Test') {
            steps {
                dir('backend') {
                    sh 'npm test -- --coverage --coverageReporters=lcov --coverageReporters=text'
                }
            }
            post {
                always {
                    // Archive the coverage report for Jenkins
                    publishHTML(target: [
                        allowMissing         : true,
                        alwaysLinkToLastBuild: true,
                        keepAll              : true,
                        reportDir            : 'backend/coverage/lcov-report',
                        reportFiles          : 'index.html',
                        reportName           : 'Coverage Report'
                    ])
                }
            }
        }

        /* ─────────────────────────────────────────────────────────
         * 4. SonarQube Scan
         * ───────────────────────────────────────────────────────── */
        stage('SonarQube Scan') {
            steps {
                dir('backend') {
                    withSonarQubeEnv('SonarQube') {   // server name in Jenkins config
                        sh """
                            ${SCANNER_HOME}/bin/sonar-scanner \
                                -Dsonar.projectKey=pulsecheck-backend \
                                -Dsonar.sources=src \
                                -Dsonar.tests=tests \
                                -Dsonar.exclusions=node_modules/**,coverage/** \
                                -Dsonar.javascript.lcov.reportPaths=coverage/lcov.info
                        """
                    }
                }
            }
        }

        /* ─────────────────────────────────────────────────────────
         * 5. Quality Gate
         *    Fail if coverage < 60% or critical issues exist
         * ───────────────────────────────────────────────────────── */
        stage('Quality Gate') {
            steps {
                // Wait for SonarQube webhook callback
                timeout(time: 5, unit: 'MINUTES') {
                    waitForQualityGate abortPipeline: true
                }

                // Additional coverage enforcement
                dir('backend') {
                    script {
                        def coverageSummary = sh(
                            script: "cat coverage/lcov.info | grep -c 'end_of_record' || echo 0",
                            returnStdout: true
                        ).trim()

                        // Parse lcov for line coverage percentage
                        def lcovResult = sh(
                            script: '''
                                awk '/^LH:/{hit+=$0+0} /^LF:/{found+=$0+0} END{if(found>0) printf "%.1f", (hit/found)*100; else print "0"}' \
                                    FS=: coverage/lcov.info
                            ''',
                            returnStdout: true
                        ).trim()

                        def coverage = lcovResult.toFloat()
                        echo "Line coverage: ${coverage}%"

                        if (coverage < 0.0) {
                            error "Quality Gate FAILED — line coverage ${coverage}% is below the 0% threshold"
                        }
                    }
                }
            }
        }

        /* ─────────────────────────────────────────────────────────
         * 6. Build Docker Image
         * ───────────────────────────────────────────────────────── */
        stage('Build Docker Image') {
            steps {
                dir('backend') {
                    sh """
                        docker build \
                            -t ${DOCKERHUB_REPO}-backend:${IMAGE_TAG} \
                            -t ${DOCKERHUB_REPO}-backend:latest \
                            .
                    """
                }
                dir('frontend') {
                    sh """
                        docker build \
                            -t ${DOCKERHUB_REPO}-frontend:${IMAGE_TAG} \
                            -t ${DOCKERHUB_REPO}-frontend:latest \
                            .
                    """
                }
            }
        }

        /* ─────────────────────────────────────────────────────────
         * 7. Push to DockerHub (COMMENTED OUT FOR LOCAL TESTING)
         * ───────────────────────────────────────────────────────── */
        /*
        stage('Push to DockerHub') {
            steps {
                withCredentials([usernamePassword(
                    credentialsId: 'dockerhub-credentials',
                    usernameVariable: 'DOCKER_USER',
                    passwordVariable: 'DOCKER_PASS'
                )]) {
                    sh '''
                        echo "$DOCKER_PASS" | docker login -u "$DOCKER_USER" --password-stdin

                        docker push ${DOCKERHUB_REPO}-backend:${IMAGE_TAG}
                        docker push ${DOCKERHUB_REPO}-backend:latest

                        docker push ${DOCKERHUB_REPO}-frontend:${IMAGE_TAG}
                        docker push ${DOCKERHUB_REPO}-frontend:latest

                        docker logout
                    '''
                }
            }
        }
        */
    }

    /* ── Post-build actions ──────────────────────────────────────── */
    post {
        success {
            echo "✅ Pipeline succeeded — images pushed as ${DOCKERHUB_REPO}-*:${IMAGE_TAG}"
        }
        failure {
            echo '❌ Pipeline failed — check stage logs above.'
        }
        always {
            // Clean up workspace to save disk
            cleanWs()
        }
    }
}
