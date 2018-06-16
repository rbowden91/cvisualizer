const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const path = require('path');
const fs = require('fs');
const uuid = require('uuid/v4');

const { spawn } = require('child_process');

app.use(express.static(path.join(__dirname, 'public')));

io.on('connection', function(socket){
  console.log('a user connected');
});

http.listen(12345, function(){
  console.log('listening on *:12345');
});

var children = {};

function setup_child(socket, msg) {
    var child = spawn('python3', ['shim.py'], {stdio: 'pipe'});

    // TODO: make sure this msg is valid?
    child.stdin.write(JSON.stringify(msg) + '\n')

    children[socket.id] = child;


    //child.stdout.setEncoding('utf8')
    child.stdout.on('data', function(data) {
        console.log(data.toString())
        // don't bother parsing it if the child is going to have to do that again anyway
        socket.emit('info', data.toString())
    })

    // TODO: handle this
    child.stderr.on('data', function(data) {
        console.log(data.toString())
    })

    // TODO: do we always output stderr before stdout?
    child.on('close', function(code, signal) {
        console.log('closing code: ' + code + ' ' + signal)
        socket.emit('shim-exit', {
            'return_code': code
        });
        delete children[socket.id];
    })
    child.on('exit', function(code, signal) {
        console.log('exiting: ' + code + ' ' + signal)
        socket.emit('shim-exit', {
            'return_code': code
        });
        delete children[socket.id];
    })
}

// TODO: on disconnect, delete child process?
// TODO: if shim dies, we seem to, too
io.on('connection', function(socket){
    socket.on('disconnect', function() {
        console.log('user disconnected');
        var child = children[socket.id]
        // TODO: give it a minute to reconnect before killing it?? Is reconnecting possible?
        if (typeof child !== 'undefined') {
            child.kill('SIGKILL');
        }
    });

    socket.on('cmd', function(msg){
        var child = children[socket.id]
        if (typeof child !== 'undefined') {
            child.stdin.write(JSON.stringify(msg) + '\n')
        } else {
            socket.emit('shim-not-running', "Child not running!");
        }
    });

    // TODO: set a timeout so they can't take forever running code?
    socket.on('code', function(msg){
        var child = children[socket.id]
        if (typeof child !== 'undefined') {
            child.kill('SIGKILL');
        }
        setup_child(socket, msg);
    });
});
