import click
import os
from microraiden.click_helpers import main, pass_app
from flask import make_response
import logging

from microraiden.proxy.content import (
    PaywalledContent,
)


@main.command()
@click.option(
    '--host',
    default='localhost',
    help='Address of the proxy'
)
@click.option(
    '--port',
    default=5000,
    help='Port of the proxy'
)
@pass_app
def start(app, host, port):
    app.add_content(PaywalledContent("teapot", 1, lambda _: ("HI I AM A TEAPOT", 418)))
    app.run(host=host, port=port, debug=True)  # nosec
    app.join()


if __name__ == '__main__':
    from gevent import monkey

    monkey.patch_all()
    logging.basicConfig(level=logging.DEBUG)
    logging.getLogger("urllib3").setLevel(logging.WARNING)
    logging.getLogger("blockchain").setLevel(logging.DEBUG)
    logging.getLogger("channel_manager").setLevel(logging.DEBUG)
    main()
