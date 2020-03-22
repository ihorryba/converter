deploy:
	gcloud config set project my-project-1524747394229
	gcloud app deploy app.yaml

deploy_qa:
	gcloud config set project my-project-1524747394229
	gcloud app deploy app-qa.yaml

deploy_staging:
	gcloud config set project my-project-1524747394229
	gcloud app deploy app-staging.yaml

gcloud auth login
