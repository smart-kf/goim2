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

# 下载依赖discovery 到 bin 目录
discovery:
	curl -sSL -o discovery.tar.gz https://github.com/bilibili/discovery/releases/download/v1.0.1/discovery_1.0.1_Linux_x86_64.tar.gz
	mkdir discovery
	tar -zxvf discovery.tar.gz -C discovery
	mv discovery/discovery bin/dis

# 下载依赖discovery 到 bin 目录
discovery-macos:
	curl -sSL -o discovery.tar.gz https://github.com/smart-kf/discovery/releases/download/v1.0.1/discovery_1.0.1_darwin_arm64.tar.gz
	mkdir discovery
	tar -zxvf discovery.tar.gz -C discovery
	mv discovery/discovery bin/dis
	rm -rf discovery.tar.gz

discovery-local-image:
	curl -sSL -o discovery.tar.gz https://github.com/smart-kf/discovery/releases/download/v1.0.1/discovery_1.0.1_linux_amd64_m2.tar.gz
	mkdir discovery
	tar -zxvf discovery.tar.gz -C discovery
	mv discovery/discovery bin/dis
	rm -rf discovery.tar.gz

build-image:
	docker build -t goim .

reload:
	@docker compose stop && docker compose rm -f && docker compose up -d

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
