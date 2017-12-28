FROM python:3

LABEL maintainer="jingwei.hu@atmatrix.org"

RUN mkdir -p /uraiden
WORKDIR /uraiden

COPY uraiden /uraiden

RUN pip install -e microraiden

EXPOSE 5000

ENTRYPOINT [ "python3" ]