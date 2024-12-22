# Go parameters
GOCMD=GOOS=linux GOARCH=amd64 CGO_ENABLED=0 go
GOBUILD=$(GOCMD) build
GOTEST=$(GOCMD) test

all: test build
build:
	rm -rf bin/
	mkdir bin/
	go mod tidy
	$(GOBUILD) -o bin/comet cmd/comet/main.go
	$(GOBUILD) -o bin/logic cmd/logic/main.go
	$(GOBUILD) -o bin/job cmd/job/main.go
	cd cmd/dis && go mod tidy && $(GOBUILD) -o ../../bin/dis main.go

test:
	$(GOTEST) -v ./...

clean:
	rm -rf target/

run:
	nohup bin/logic -conf=bin/logic.toml -region=sh -zone=sh001 -deploy.env=dev -weight=10 2>&1 > bin/logic.log &
	nohup bin/comet -conf=bin/comet.toml -region=sh -zone=sh001 -deploy.env=dev -weight=10 -addrs=127.0.0.1 -debug=true 2>&1 > bin/comet.log &
	nohup bin/job -conf=bin/job.toml -region=sh -zone=sh001 -deploy.env=dev 2>&1 > bin/job.log &

stop:
	pkill -f dis/logic
	pkill -f dis/job
	pkill -f dis/comet
