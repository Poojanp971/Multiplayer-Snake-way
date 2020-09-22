const io = require('socket.io')();
const { createGameState, gameLoop, getUpdatedVelocity, initGame } = require('./game');
const { FRAME_RATE } = require('./constants');
const { makeId } = require('./util');

const state = {};
const clientRooms = {};

io.on('connection',client => {
    //client.emit('init', {data: 'hello world'});
    const state = createGameState();

    //listening functions and room logic
    client.on('keydown', handleKeydown);
    client.on('newGame', handleNewGame);
    client.on('joinGame', handleJoinGame);
    
    function handleJoinGame(gameCode) {
        const room = io.sockets.adapter.rooms[gameCode];

        let allUsers;
        if(room) {
            allUsers =room.sockets;
        }

        let numClients = 0;
        if(allUsers) {
            numClients = Object.keys(allUsers).length; //counting no of clients
        }

        if(numClients === 0) {
            client.emit('Unknown Game');
            return;
        }
        else if(numClients > 1){
            client.emit('Too many players');
            return;
        }

        clientRooms[client.id] = gameCode;

        client.join(gameCode);
        client.number = 2;
        client.emit('init', 2);

        startGameInterval(gameCode);
    }

    function handleNewGame() {
        let roomName = makeId(5);
        clientRooms[client.id] = roomName;
        client.emit('gameCode', roomName);

        state[roomName] = initGame();

        client.join(roomName);
        client.number = 1;
        client.emit('init', 1)
    }

    function handleKeydown(keyCode){
        const roomName = clientRooms[client.id];
        
        if(!roomName) {
            return;
        }

        try {
            keyCode = parseInt(keyCode);
        } 
        catch(e) {
            console.error(e);
            return;
        }
        
        const vel = getUpdatedVelocity(keyCode);
        
        if (vel) {
            state[roomName].player[client.number - 1].vel = vel
        }
    }
});

function startGameInterval(roomName) {
    const intervalId = setInterval(() => {
        const winner = gameLoop(state[roomName]);
        //console.log('interval');


        if(!winner) {
            emiGameState(roomName,state[roomName]);
            client.emit('gameState', JSON.stringify(state));
        }
        else{
            emitGameOver(roomName, winner)
            state[roomName] = null;
            clearInterval(intervalId);

        }
    }, 1000 / FRAME_RATE);
}

function emiGameState(roomName, state) {
    io.sockets.in(roomName).emit('gameState', JSON.stringify(state));
}

function emitGameOver(roomName, winner) {
    io.sockets.in(roomName).emit('gameOver', JSON.stringify({ winner }));
}

io.listen(3000);
