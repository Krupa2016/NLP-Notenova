pipeline {
    agent any

    environment {
        APP_NAME = 'notesense'
        IMAGE_TAG = "${env.BUILD_NUMBER}"
        REGISTRY_HOST = 'docker.io'
        BACKEND_IMAGE = "notesense/backend:${IMAGE_TAG}"
        FRONTEND_IMAGE = "notesense/frontend:${IMAGE_TAG}"
        DEPLOY_ENV = 'production'
    }

    stages {
        stage('Checkout & Version Control') {
            steps {
                echo 'Checking out source code from Git repository...'
                checkout scm
                sh 'git log -1 --pretty=format:"Commit: %h - %s by %an"'
            }
        }

        stage('Install Backend Dependencies') {
            steps {
                echo 'Installing Python packages required by the backend and tests...'
                sh '''
                    cd backend
                    python -m pip install --upgrade pip
                    python -m pip install -r requirements.txt
                    python -c "import fastapi, pytest, jwt, sentence_transformers, faiss; print('Backend dependencies verified')"
                '''
            }
        }

        stage('Code Quality & Lint') {
            parallel {
                stage('Backend Lint') {
                    steps {
                        echo 'Running Python backend syntax checks...'
                        sh '''
                            cd backend
                            python -m py_compile main.py services/*.py
                        '''
                    }
                }
                stage('Frontend Lint') {
                    steps {
                        echo 'Running frontend dependency check...'
                        sh '''
                            cd frontend
                            npm ci --prefer-offline || npm install
                        '''
                    }
                }
            }
        }

        stage('Automated Backend Unit & Integration Tests') {
    steps {
        echo 'Installing backend dependencies and running tests...'
        dir('backend') {
            sh 'python -m pip install -r requirements.txt'
            sh 'python -m pytest tests/ --junitxml=test-reports/results.xml -v'
        }
    }
    post {
        always {
            junit allowEmptyResults: true,
                  testResults: 'backend/test-reports/results.xml'
        }
    }
}




   
stage('Verify Docker') {
    steps {
        sh '''
            echo "Checking Docker from Jenkins..."

            export PATH="$PATH:/c/Users/Acer/AppData/Local/Programs/DockerDesktop/resources/bin"

            which docker
            docker.exe --version
            docker.exe info
        '''
    }
}





stage('Build Docker Images') {
    steps {
        echo 'Building Docker images for backend and frontend...'
        sh '''
            export PATH="$PATH:/c/Users/Acer/AppData/Local/Programs/DockerDesktop/resources/bin"

            docker.exe build -t "${BACKEND_IMAGE}" -t notesense/backend:latest ./backend
            docker.exe build -t "${FRONTEND_IMAGE}" -t notesense/frontend:latest ./frontend
        '''
    }
}


        stage('Container Health Check & Verification') {
            steps {
                echo 'Starting a test backend container and checking its health endpoint...'
                sh '''
                    docker rm -f notesense-test-backend 2>/dev/null || true
                    docker run -d --name notesense-test-backend -p 8001:8000 ${BACKEND_IMAGE}
                    echo "Waiting for backend initialization and model loading..."
                    sleep 15
                    curl -s -f http://localhost:8001/health || (docker logs notesense-test-backend && docker rm -f notesense-test-backend && exit 1)
                    echo "Backend container passed health check successfully."
                    docker rm -f notesense-test-backend
                '''
            }
        }

        stage('Ansible Continuous Deployment') {
            steps {
                echo 'Deploying NoteSense services via Ansible...'
                sh '''
                    ansible-playbook -i ansible/hosts.ini ansible/deploy.yml \\
                        --extra-vars "backend_image=${BACKEND_IMAGE} frontend_image=${FRONTEND_IMAGE}"
                '''
            }
        }
    }

    post {
        success {
            echo "CI/CD Pipeline succeeded: NoteSense release ${IMAGE_TAG} was built and verified."
        }
        failure {
            echo "Pipeline failed. Attempting rollback if Ansible is installed and configured."
            sh '''
                if command -v ansible-playbook >/dev/null 2>&1; then
                    ansible-playbook -i ansible/hosts.ini ansible/rollback.yml || true
                else
                    echo "Ansible is not installed; skipping rollback command."
                fi
            '''
            echo 'Email notification skipped: configure SMTP in Jenkins before enabling mail notifications.'
        }
    }
}
