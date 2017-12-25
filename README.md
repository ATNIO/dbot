# dbot
establish AI services

~~~
npm i

cd microraiden
virtualenv -p python3 env
. env/bin/activate
pip install -e microraiden
python3 -m server --private-key key --private-key-password-file password --rpc-provider http://118.31.18.101:4045 start
~~~

