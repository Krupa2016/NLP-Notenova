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
                        echo 'Running Frontend dependency & build check...'
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
                echo 'Executing PyTest test suite (RBAC, FAISS, Courses, Healthcheck)...'
                sh '''
                    cd backend
                    python -m pytest tests/ --junitxml=test-reports/results.xml -v
                '''
            }
            post {
                always {
                    junit allowEmptyResults: true, testResults: 'backend/test-reports/*.xml'
                }
            }
        }

        stage('Build Docker Images') {
            steps {
                echo 'Building production Docker images for Backend and Frontend...'
                sh '''
                    docker build -t ${BACKEND_IMAGE} -t notesense/backend:latest ./backend
                    docker build -t ${FRONTEND_IMAGE} -t notesense/frontend:latest ./frontend
                '''
            }
        }

        stage('Container Health Check & Verification') {
            steps {
                echo 'Spinning up test container to verify /health endpoint...'
                sh '''
                    docker run -d --name notesense-test-backend -p 8001:8000 ${BACKEND_IMAGE}
                    echo "Waiting for backend initialization and PyTorch model loading..."
                    sleep 15
                    curl -s -f http://localhost:8001/health || (docker logs notesense-test-backend && exit 1)
                    echo "Backend container passed health check successfully."
                    docker rm -f notesense-test-backend
                '''
            }
        }

        stage('Ansible Continuous Deployment') {
            steps {
                echo 'Deploying NoteSense services via Ansible Configuration Management...'
                sh '''
                    ansible-playbook -i ansible/hosts.ini ansible/deploy.yml \
                        --extra-vars "backend_image=${BACKEND_IMAGE} frontend_image=${FRONTEND_IMAGE}"
                '''
            }
        }
    }

    post {
        success {
            echo "CI/CD Pipeline Succeeded: NoteSense release ${IMAGE_TAG} successfully built, verified, and deployed."
        }
        failure {
            echo "Pipeline failed! Initiating automated rollback to previous stable deployment..."
            sh '''
                ansible-playbook -i ansible/hosts.ini ansible/rollback.yml || true
            '''
            mail to: 'devops-alerts@notesense.ai',
                 subject: "NoteSense CI/CD Pipeline Failed - Build #${env.BUILD_NUMBER}",
                 body: "The NoteSense build #${env.BUILD_NUMBER} failed during pipeline execution. Automatic rollback initiated."
        }
    }
}
