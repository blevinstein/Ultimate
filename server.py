import SimpleHTTPServer
import argparse

parser = argparse.ArgumentParser()
parser.add_argument('--port', default = 8000, type = int)

def main():
  import os
  import SocketServer

  args = parser.parse_args();
  port = args.port

  httpd = SocketServer.TCPServer(("", port), SimpleHTTPServer.SimpleHTTPRequestHandler)

  print "serving at port", port
  httpd.serve_forever()

if __name__ == "__main__":
  main()
