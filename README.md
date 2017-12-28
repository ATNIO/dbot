# dbot
establish AI services

~~~
$ cd dbot
$ npm i && node server.js

$ cd microraiden
$ virtualenv -p python3 env
$ . env/bin/activate
$ pip install -e microraiden
$ python3 -m server --private-key key --private-key-password-file password --rpc-provider http://118.31.18.101:4045 start
~~~

##docker

~~~
$ cd docker
$ docker pull redis
$ docker run --name dbot-redis -d -p 6379:6379 redis

$ docker build -f dbot.Dockerfile -t dbot-xiaoi .
$ docker run -it --rm --name dbot-XIAOI -d -p 3000:3000 dbot-xiaoi 

$ docker build -f uraiden.Dockerfile -t uraiden-xiaoi .
$ docker run -it --rm --name uraiden-XIAOI -d -p 5000:5000 uraiden-xiaoi -m server --private-key key --private-key-password-file password --rpc-provider http://118.31.18.101:4045 start
~~~

