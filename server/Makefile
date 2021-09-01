## ----------------------------------------------------------------------
## This makefile is just for ease of running the dispute service docker
## container. 
## ----------------------------------------------------------------------
.PHONY : build-wheel build-container run-with-localdb build

help:
	@egrep -h '\s##\s' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m  %-30s\033[0m %s\n", $$1, $$2}'

install-poetry: ## Get poetry setup
	curl -sSL https://raw.githubusercontent.com/python-poetry/poetry/master/get-poetry.py | python -

install-pkgs: ##runs poetry install
	poetry install

build-wheel: install-pkgs ## Package the code for docker
	poetry build --format wheel

build-container: ## Create a container hosting the application
	docker build . -t graph-disputes-server-whl -f Dockerfile

run-with-localdb: ## Run the application against a locally hosted postgres on a MAC
	docker run --rm -p 8000:8000  -p 5432:5432 -it -e DB_HOST=localhost -e DB_USER=dispute_arbitrator -e DB_DATABASE=dispute_diagnosis -e DB_HOST=host.docker.internal graph-disputes-server-whl

build: build-wheel build-container ## Generate a wheel and package it in a container

build-and-run: build run-with-localdb ## Generates container and runs it local