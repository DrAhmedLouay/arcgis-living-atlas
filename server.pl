#!/usr/bin/perl
use strict;
use warnings;
use IO::Socket::INET;
use File::Basename;
use Cwd 'abs_path';

my $port = 8000;
my $dir = dirname(abs_path($0));

my %mime_types = (
    'html' => 'text/html; charset=utf-8',
    'htm'  => 'text/html; charset=utf-8',
    'css'  => 'text/css; charset=utf-8',
    'js'   => 'application/javascript; charset=utf-8',
    'json' => 'application/json; charset=utf-8',
    'png'  => 'image/png',
    'jpg'  => 'image/jpeg',
    'jpeg' => 'image/jpeg',
    'svg'  => 'image/svg+xml',
    'ico'  => 'image/x-icon',
    'woff2'=> 'font/woff2',
    'woff' => 'font/woff'
);

my $server = IO::Socket::INET->new(
    LocalHost => '0.0.0.0',
    LocalPort => $port,
    Proto     => 'tcp',
    Listen    => 10,
    Reuse     => 1
) or die "Cannot bind to port $port: $!\n";

$| = 1;
print "ArcGIS Living Atlas Server running on http://localhost:$port\n";

while (my $client = $server->accept()) {
    my $request = <$client>;
    next unless $request;
    
    # Read headers
    while (my $header = <$client>) {
        last if $header =~ /^\r?\n$/;
    }
    
    my ($method, $path) = split(' ', $request);
    $path = '/' unless $path;
    $path =~ s/\?.*$//; # Remove query params
    $path = '/index.html' if $path eq '/';
    
    my $file_path = $dir . $path;
    # Security: prevent directory traversal
    if ($file_path !~ /^\Q$dir\E/) {
        print $client "HTTP/1.1 403 Forbidden\r\nContent-Length: 9\r\n\r\nForbidden";
        close $client;
        next;
    }
    
    if (-f $file_path && open(my $fh, '<:raw', $file_path)) {
        my ($ext) = $file_path =~ /\.([^.]+)$/;
        my $mime = $mime_types{lc($ext // '')} || 'application/octet-stream';
        my $size = -s $file_path;
        
        print $client "HTTP/1.1 200 OK\r\n";
        print $client "Content-Type: $mime\r\n";
        print $client "Content-Length: $size\r\n";
        print $client "Access-Control-Allow-Origin: *\r\n";
        print $client "Connection: close\r\n\r\n";
        
        my $buffer;
        while (read($fh, $buffer, 4096)) {
            print $client $buffer;
        }
        close $fh;
    } else {
        my $body = "404 Not Found";
        print $client "HTTP/1.1 404 Not Found\r\n";
        print $client "Content-Type: text/plain\r\n";
        print $client "Content-Length: " . length($body) . "\r\n";
        print $client "Connection: close\r\n\r\n";
        print $client $body;
    }
    close $client;
}
