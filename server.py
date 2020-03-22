import SimpleHTTPServer
import argparse

parser = argparse.ArgumentParser()
parser.add_argument('--port', default = 8000, type = int)

class CorsHttpRequestHandler(SimpleHTTPServer.SimpleHTTPRequestHandler, object):
  def __init__(self, request, client_address, server):
    super(self.__class__, self).__init__(request, client_address, server)

  def do_GET(self):
    super(self.__class__, self).do_GET()

def main():
  import os
  import SocketServer

  args = parser.parse_args();
  port = args.port

  Handler = CorsHttpRequestHandler
  #Handler = SimpleHTTPServer.SimpleHTTPRequestHandler

  httpd = SocketServer.TCPServer(("", port), Handler)

  print "serving at port", port
  httpd.serve_forever()

if __name__ == "__main__":
  main()
